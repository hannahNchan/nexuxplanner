# Lib

## Propósito

`src/lib` contiene integración de bajo nivel que no pertenece a una feature visual. El cliente Supabase se inicializa una sola vez en `supabase.ts` y se exporta para servicios y algunos hooks/componentes (`src/lib/supabase.ts:1`, `src/lib/supabase.ts:16`).

## Modelo de datos

No define entidades. `supabase.ts` lee variables `NEXT_PUBLIC_SUPABASE_URL` o `VITE_SUPABASE_URL`, y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` o `VITE_SUPABASE_ANON_KEY` (`src/lib/supabase.ts:3`, `src/lib/supabase.ts:5`).

## Ciclo de vida de las entidades

No aplica.

## Autorización

No aplica directamente. El cliente usa una publishable/anon key de frontend; si faltan variables lanza error antes de crear el cliente (`src/lib/supabase.ts:10`).

## Flujos principales

La inicialización es síncrona: leer env, validar presencia de URL y key, crear cliente con `createClient` (`src/lib/supabase.ts:3`, `src/lib/supabase.ts:10`, `src/lib/supabase.ts:16`).

## Contratos externos

Exporta `supabase` para Auth, Database, Realtime y Storage (`src/lib/supabase.ts:16`). `imageUpload.ts` usa bucket `task-images` para imágenes de descripción de tareas (`src/lib/imageUpload.ts:9`, `src/lib/imageUpload.ts:38`).

## Errores y casos borde

Si faltan variables, el módulo lanza `Missing Supabase environment variables...`, lo que impide montar la app (`src/lib/supabase.ts:10`).

## Trampas

No pongas service role keys en este archivo: se importa desde frontend. El nombre de env soporta variantes Vite y Next-style; eliminar una variante puede romper despliegues existentes (`src/lib/supabase.ts:3`, `src/lib/supabase.ts:5`).

## Preguntas abiertas

No se verificó si existen `.env` locales o de Netlify en el repo porque no aparecen en `rg --files`.
