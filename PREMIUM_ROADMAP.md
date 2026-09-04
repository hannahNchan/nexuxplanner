# NexusPlanner — Plan de evolución a producto premium

Última revisión: 2026-07-29

Este documento reescribe y corrige el plan de 10 puntos para pasar de "frontend que hace
todo" a un producto real y escalable sobre Supabase. Está aterrizado en el código actual
del repo, no en teoría genérica.

---

## Premisa: de qué parte NexusPlanner (no es un demo naíf)

Antes de "arreglar" nada hay que reconocer lo que **ya existe** y funciona, porque varios
de los 10 puntos originales ya están hechos a medias y no hay que rehacerlos:

| Ya existe en el repo | Dónde |
|---|---|
| Frontera de servicios (el frontend no hace SQL suelto) | `src/features/api/*Service.ts` |
| RPCs transaccionales | `create_project_with_defaults`, `create_organization_with_owner`, `accept_organization_invitation` |
| Triggers server-side | notificación de asignación, prevención de ciclos de dependencias, bloqueo cross-project |
| RLS con helpers de permisos | `is_organization_member`, `is_organization_admin`, `is_project_member`, `is_project_owner`, `can_view_project` |
| Realtime | publicado en `tasks`, `user_notifications`, `organization_invitations` |
| Invariantes en DB | índice único parcial de 1 sprint activo por proyecto |

**Conclusión:** el trabajo no es "sacar la lógica del frontend desde cero", es
**consolidar el patrón que ya empezó** y añadir las capas de producto que faltan.

---

## Principio arquitectónico rector: elegir la herramienta correcta

El error del plan original es proponer **Edge Functions como capa de comandos por defecto**.
Para una app client-side con buena RLS, eso añade latencia (un salto de red extra),
un runtime más que mantener, y duplica la lógica de permisos que ya vive en RLS.

Regla de decisión:

| Necesidad | Herramienta correcta | Por qué |
|---|---|---|
| Comando atómico de dominio (completar sprint, crear tarea, mover backlog→sprint) | **RPC de Postgres (`SECURITY DEFINER`)** | Transaccional, sin salto de red, ya es el patrón del repo |
| Reaccionar a un cambio de fila (audit, notificación) | **Trigger** | Garantiza que ocurre aunque el cliente falle |
| Secretos / HTTP externo / email / procesar imágenes | **Edge Function** | Es lo único que SQL no puede hacer |
| Cambios vivos en la UI | **Realtime** (Postgres Changes / Broadcast / Presence) | Ya está parcialmente montado |
| Jobs pesados o diferidos | **Queue + Edge Function** | Solo cuando ya exista email/integración |
| Reportes / métricas | **Vista o RPC** primero; materialized view + Cron **solo si hay lentitud real** | Evitar optimización prematura |

> **Patrón objetivo del frontend:**
> `Frontend → command/query client → RPC / View / Edge Function → Postgres (tablas + RLS + triggers + queues)`
> El frontend manda *intención* ("completar sprint X con estas disposiciones") y recibe
> resultado. No orquesta pasos intermedios.

---

## Los 10 puntos, corregidos y priorizados

Reordenados por **valor / costo real**, no por vistosidad. Cada fase entrega algo usable.

### FASE 1 — Fiabilidad (evita los bugs feos; alto valor, bajo costo)

#### 1. RPCs transaccionales para los flujos multi-paso que aún viven en React
Sacar de React la orquestación de operaciones "todo o nada". Herramienta: **RPC, no Edge Function.**

Candidatos prioritarios (donde hoy hay más pasos sueltos y riesgo de estado inconsistente):
- `complete_sprint(sprint_id, dispositions)` — cerrar sprint + mover incompletas (backlog / otro sprint / sprint nuevo) en una transacción.
- `move_task_to_sprint(task_id, sprint_id, first_column_id)` — backlog→sprint→columna inicial atómico (hoy son varios `update`).
- `assign_task(task_id, assignee_id)` — validar membresía + asignar + disparar notificación.
- `start_sprint(sprint_id)` — reforzar en RPC la regla de "un solo activo" (hoy en servicio + índice).

**Impacto:** desaparecen los estados intermedios raros, el doble-click y las race conditions.

#### 2. Motor de permisos formalizado
Hoy `can_edit` se calcula en **JavaScript** dentro de `projectService.fetchProjects`. Eso significa
que la autoridad de edición no está en la base. Formalizar como funciones SQL y usarlas en RLS **y** en los RPCs:
- `can_edit_project(project_id)` — miembro explícito de `project_members`.
- `can_manage_project(project_id)` — owner del proyecto.
- `can_manage_organization(organization_id)` — owner/admin de la org.
- `can_assign_task(task_id, assignee_id)`, `can_complete_sprint(sprint_id)`.

Ya existen `can_view_project`, `is_project_member`, etc.; esto **completa** ese modelo.
El frontend puede seguir ocultando botones, pero la autoridad vive en la base.

---

### FASE 2 — Trazabilidad y colaboración (lo que de verdad se *siente* premium)

#### 3. Event log / audit trail escrito por triggers
Tabla `activity_events` (o `audit_events`) escrita **por triggers/RPCs, nunca por el frontend**:
`event_type`, `actor_id`, `project_id`, `entity_type`, `entity_id`, `payload jsonb`, `created_at`.

Eventos: tarea creada/asignada/movida a Hecho, sprint iniciado/cerrado, épica movida,
dependencia creada/eliminada, usuario invitado/agregado/removido, rol cambiado, visibilidad cambiada.

Desbloquea: **timeline por ticket y por proyecto**, estilo Jira/Linear. Base para el punto 5 y 10.

#### 4. Capa de colaboración (esto es lo que el usuario ve y le hace decir "es un producto")
- Comentarios por ticket (`task_comments`).
- Menciones `@usuario` (parsear en el comentario → genera evento + notificación).
- Watchers (`task_watchers`): quién sigue un ticket.
- Attachments con permisos (reusar Storage + RLS).

Es la capa que más diferencia demo de producto, y **se apoya en los puntos 2 y 3**.

#### 5. Plataforma de notificaciones alimentada por eventos
Ampliar lo que ya existe (`user_notifications` + trigger de asignación) a una plataforma:
- Tablas: `user_notifications`, `notification_preferences`.
- Fuentes: asignación, mención, invitación, cambio de rol, dependencia bloqueante, tarea a Hecho, sprint por terminar.
- Creación: triggers/RPCs. Entrega inmediata: **Realtime**. Email/push: **Queue + Edge Function** (Fase 4).

---

### FASE 3 — Realtime colaborativo (dejar de hacer "reload board")

#### 6. Realtime en tres capas, no como parche
Hoy el board hace un "recarga todo el board" con debounce ante cambios. Convertirlo en producto:
- **Postgres Changes** para datos persistidos: tareas, sprints, notificaciones (updates granulares, no full reload).
- **Broadcast** para eventos efímeros: "alguien está editando esta tarea", cursor en roadmap.
- **Presence** para usuarios conectados por proyecto/organización ("Hannah está viendo este ticket").

**Impacto premium:** tablero vivo, asignaciones al instante, indicador de edición concurrente, usuarios online.

---

### FASE 4 — Escala (SOLO cuando el volumen o las integraciones lo pidan)

> Advertencia: estos puntos eran el grueso "impresionante" del plan original, pero a la
> escala actual son **optimización prematura**. Hacerlos antes de tiempo añade complejidad
> sin beneficio medible. Se activan cuando exista una necesidad real.

#### 7. Emails e integraciones vía Edge Function + Queue
Cuando exista email transaccional (invitaciones, digests) o integraciones (GitHub/Slack):
- **Edge Function** para el envío (necesita secretos y HTTP externo → aquí SÍ es la herramienta correcta).
- **Supabase Queues (PGMQ)** para desacoplar: el RPC encola la intención, el worker procesa en background.
Usos: email de invitación, procesar/optimizar imágenes subidas, digest diario/semanal, sync futuras.

#### 8. Métricas y dashboards
Empezar **simple**: vistas SQL o RPCs que calculan al vuelo (`sprint_metrics`, `user_workload`, `epic_progress`).
Métricas: velocity, burndown, throughput, carga por persona, aging tasks, trabajo bloqueado por dependencia.
**Materialized views + Supabase Cron solo cuando esas queries se vuelvan lentas con datos reales**, no antes.

---

## Tabla resumen: plan original vs. corregido

| # original | Diagnóstico | Corrección |
|---|---|---|
| 1. Edge Functions como comandos | ❌ Herramienta equivocada por defecto | ➡️ **RPC** para casi todo; Edge Function solo con secretos/HTTP/imágenes |
| 2. RPCs transaccionales | ✅ Correcto y barato | Mantener; es la Fase 1 |
| 3. Audit trail | ✅ Alto valor | Fase 2, escrito por triggers |
| 4. Notificaciones server-driven | ✅ Buena extensión de lo existente | Fase 2, alimentada por eventos |
| 5. Realtime (broadcast/presence) | ✅ Mejora legítima | Fase 3 |
| 6. Queues | ⚠️ Prematuro | Fase 4, solo tras email/integraciones |
| 7. Métricas materializadas | ⚠️ Optimización prematura | Fase 4, empezar con vistas/RPC simples |
| 8. API interna estable | ✅ Principio válido | Se logra con Fases 1–2 (RPC + views) |
| 9. Permisos centralizados | ✅ Ya medio hecho | Fase 1, formalizar `can_edit_project` en SQL |
| 10. Colaboración premium | ✅ Lo que más se nota | Fase 2 (comentarios, menciones, watchers) |

---

## Recomendación de arranque

Empezar por **`complete_sprint` como RPC transaccional** (Fase 1, punto 1). Es el flujo donde
hoy más lógica sensible vive en el frontend (cerrar sprint + repartir tareas incompletas) y
donde más fácil salen bugs de estado inconsistente. Entrega valor inmediato y establece el
patrón RPC que guía todo lo demás.

Segundo: formalizar `can_edit_project()` en SQL (punto 2), porque casi todos los RPCs
posteriores lo van a necesitar como guardia de autorización.
