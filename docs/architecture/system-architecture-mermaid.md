# NexusPlanner System Architecture Mermaid

Diagrams derived from the repository code, migrations, deployment config, SDK clients, environment variables, and Supabase Edge Functions. Provider names are decomposed into capabilities instead of single boxes.

## D1 - Context

```mermaid
flowchart LR
  subgraph publicNet["Red publica / Internet"]
    user["Usuario<br/>navegador"]
    google["Google OAuth<br/>identidad externa"]
    fonts["Google Fonts<br/>Inter"]
  end

  subgraph nexus["NexusPlanner"]
    app["NexusPlanner SPA<br/>planificacion scrum"]
  end

  subgraph supa["Capacidades Supabase"]
    auth["Auth / JWT<br/>sesiones"]
    data["Postgres + RLS<br/>datos de producto"]
    storage["Storage buckets<br/>assets publicos"]
    realtime["Realtime<br/>canales WebSocket"]
    edge["Edge Functions<br/>commands / worker"]
  end

  user -->|HTTPS, carga app| app
  app -->|HTTPS OAuth redirect| auth
  auth -->|OAuth HTTPS| google
  app -->|HTTPS font files| fonts
  app -->|HTTPS REST/RPC, JWT| data
  app -->|HTTPS Storage API, JWT| storage
  app -->|WebSocket postgres_changes, JWT| realtime
  app -->|HTTPS invoke, JWT| edge
  edge -->|HTTPS RPC, JWT/service role| data
  data -.->|publication events| realtime

  classDef frontend fill:#e8f1ff,stroke:#2f80ed,color:#0f172a
  classDef service fill:#ecfdf5,stroke:#059669,color:#0f172a
  classDef data fill:#fff7ed,stroke:#f97316,color:#0f172a
  classDef third fill:#f5f3ff,stroke:#7c3aed,color:#0f172a
  class app,user frontend
  class auth,realtime,edge service
  class data,storage data
  class google,fonts third

  legendFrontend["Leyenda: frontend"]:::frontend
  legendService["Leyenda: servicio"]:::service
  legendData["Leyenda: datos"]:::data
  legendThird["Leyenda: tercero"]:::third
```

## D2 - Containers

```mermaid
flowchart LR
  subgraph client["Cliente / navegador"]
    spa["React SPA<br/>Vite + MUI + Router"]
    sdk["Supabase JS Client<br/>REST/RPC/Auth/Storage/Realtime"]
  end

  subgraph staticHost["Hosting estatico publico"]
    netlify["Netlify static site<br/>SPA fallback /* -> index.html"]
  end

  subgraph thirdParty["Servicios externos publicos"]
    googleOAuth["Google OAuth<br/>provider confirmado"]
    googleFonts["Google Fonts<br/>Inter"]
  end

  subgraph supabasePublic["Supabase endpoints publicos"]
    authSvc["Auth Service<br/>emite sesion JWT"]
    postgrest["Data API / PostgREST<br/>tablas + RPC"]
    storageApi["Storage API<br/>upload/public URL/remove"]
    realtimeWs["Realtime Gateway<br/>WebSocket"]
    edgeTask["Edge Function<br/>task-commands"]
    edgeSprint["Edge Function<br/>sprint-commands"]
    edgeWorkspace["Edge Function<br/>workspace-commands"]
    edgeWorker["Edge Function<br/>job-worker"]
  end

  subgraph supabaseData["Supabase Postgres / datos"]
    pg["Postgres DB<br/>tablas + RLS"]
    rpc["SQL RPC Commands<br/>SECURITY DEFINER"]
    triggers["SQL Triggers<br/>events/notifications/automations"]
    cron["pg_cron<br/>maintenance/deadlines"]
    outbox["command_jobs<br/>outbox / cola durable"]
    buckets["Storage Buckets<br/>avatars/task-images/project-assets"]
  end

  spa -->|HTTPS GET assets| netlify
  spa -->|HTTPS font CSS/files| googleFonts
  spa -->|SDK calls| sdk
  sdk -->|HTTPS OAuth/JWT| authSvc
  authSvc -->|OAuth HTTPS| googleOAuth
  sdk -->|HTTPS REST/RPC, anon key + JWT| postgrest
  sdk -->|HTTPS Storage API, JWT| storageApi
  sdk -->|WebSocket postgres_changes, JWT| realtimeWs
  sdk -->|HTTPS POST invoke, JWT| edgeTask
  sdk -->|HTTPS POST invoke, JWT| edgeSprint
  sdk -->|HTTPS POST invoke, JWT| edgeWorkspace

  postgrest -->|Postgres function/table access| pg
  postgrest -->|Postgres RPC| rpc
  storageApi -->|bucket object operations| buckets
  realtimeWs -.->|publication stream| pg

  edgeTask -->|HTTPS RPC with user Authorization| postgrest
  edgeSprint -->|HTTPS RPC with user Authorization| postgrest
  edgeWorkspace -->|HTTPS RPC with user Authorization| postgrest
  edgeWorker -->|HTTPS RPC with service role + worker secret| postgrest

  rpc -->|INSERT/UPDATE/DELETE, RLS-aware checks| pg
  rpc -.->|enqueue_command_job| outbox
  rpc -.->|record_activity_event| triggers
  triggers -.->|insert user_notifications / automation_runs| pg
  triggers -.->|enqueue automation jobs| outbox
  cron -.->|SQL schedule invokes functions| rpc
  edgeWorker -->|claim/complete/fail jobs| outbox

  classDef frontend fill:#e8f1ff,stroke:#2f80ed,color:#0f172a
  classDef service fill:#ecfdf5,stroke:#059669,color:#0f172a
  classDef data fill:#fff7ed,stroke:#f97316,color:#0f172a
  classDef third fill:#f5f3ff,stroke:#7c3aed,color:#0f172a
  class spa,sdk,netlify frontend
  class authSvc,postgrest,storageApi,realtimeWs,edgeTask,edgeSprint,edgeWorkspace,edgeWorker,rpc,triggers,cron service
  class pg,outbox,buckets data
  class googleOAuth,googleFonts third

  legendFrontend["Leyenda: frontend/hosting"]:::frontend
  legendService["Leyenda: servicio/capacidad"]:::service
  legendData["Leyenda: datos/estado"]:::data
  legendThird["Leyenda: tercero"]:::third
```

## D3 - Auth Domain

```mermaid
flowchart LR
  subgraph client["Cliente / navegador"]
    authForm["AuthForm<br/>Google o email"]
    authGate["AuthGate<br/>getSession/onAuthStateChange"]
    spaSession["React App<br/>render con session.user"]
  end

  subgraph publicIdentity["Identidad externa"]
    google["Google OAuth<br/>provider google"]
  end

  subgraph supabaseAuthBoundary["Supabase Auth publico"]
    authSvc["Auth Service<br/>sesion JWT"]
  end

  subgraph dataBoundary["Datos con autorizacion"]
    dataApi["Data API / RPC<br/>usa JWT"]
    rls["Postgres RLS<br/>auth.uid() / can_*"]
  end

  authForm -->|HTTPS signInWithOAuth, redirectTo| authSvc
  authSvc -->|OAuth HTTPS redirect| google
  google -->|HTTPS callback fragment/session| authSvc
  authForm -->|HTTPS signInWithPassword| authSvc
  authGate -->|HTTPS getSession| authSvc
  authSvc -->|JWT/session event| authGate
  authGate -->|session.user| spaSession
  spaSession -->|HTTPS REST/RPC, JWT| dataApi
  dataApi -->|Postgres role/auth.uid checks| rls

  classDef frontend fill:#e8f1ff,stroke:#2f80ed,color:#0f172a
  classDef service fill:#ecfdf5,stroke:#059669,color:#0f172a
  classDef data fill:#fff7ed,stroke:#f97316,color:#0f172a
  classDef third fill:#f5f3ff,stroke:#7c3aed,color:#0f172a
  class authForm,authGate,spaSession frontend
  class authSvc,dataApi service
  class rls data
  class google third

  legendFrontend["Leyenda: frontend"]:::frontend
  legendService["Leyenda: servicio"]:::service
  legendData["Leyenda: autorizacion/datos"]:::data
  legendThird["Leyenda: tercero"]:::third
```

## D4 - Product Commands Domain

```mermaid
flowchart LR
  subgraph client["Cliente / navegador"]
    ui["Pantallas React<br/>Backlog/Board/Settings"]
    apiServices["src/features/api<br/>service layer"]
  end

  subgraph commandHttp["Edge Functions publicas opcionales"]
    taskEdge["task-commands<br/>create/assign"]
    sprintEdge["sprint-commands<br/>complete sprint"]
    workspaceEdge["workspace-commands<br/>org/project/invitations"]
  end

  subgraph dataApiBoundary["Supabase Data API"]
    rpcGateway["RPC Gateway<br/>PostgREST rpc"]
  end

  subgraph postgresBoundary["Postgres autorizado"]
    taskRpc["Task/Sprint RPCs<br/>create/assign/move/complete"]
    workspaceRpc["Workspace RPCs<br/>org/project/members"]
    permissions["SQL permission functions<br/>can_view/can_mutate/can_manage"]
    tables["Product tables<br/>projects/tasks/sprints/etc."]
    events["activity_events<br/>audit/event feed"]
    jobs["command_jobs<br/>outbox durable"]
  end

  ui -->|function calls| apiServices
  apiServices -->|HTTPS RPC, JWT| rpcGateway
  apiServices -->|HTTPS POST invoke, JWT| taskEdge
  apiServices -->|HTTPS POST invoke, JWT| sprintEdge
  apiServices -->|HTTPS POST invoke, JWT| workspaceEdge
  taskEdge -->|HTTPS RPC, forwarded Authorization| rpcGateway
  sprintEdge -->|HTTPS RPC, forwarded Authorization| rpcGateway
  workspaceEdge -->|HTTPS RPC, forwarded Authorization| rpcGateway

  rpcGateway -->|Postgres execute function| taskRpc
  rpcGateway -->|Postgres execute function| workspaceRpc
  taskRpc -->|SQL permission check| permissions
  workspaceRpc -->|SQL permission check| permissions
  taskRpc -->|INSERT/UPDATE transactional| tables
  workspaceRpc -->|INSERT/UPDATE transactional| tables
  taskRpc -.->|INSERT event| events
  workspaceRpc -.->|INSERT event| events
  taskRpc -.->|enqueue_command_job| jobs
  workspaceRpc -.->|enqueue_command_job| jobs

  classDef frontend fill:#e8f1ff,stroke:#2f80ed,color:#0f172a
  classDef service fill:#ecfdf5,stroke:#059669,color:#0f172a
  classDef data fill:#fff7ed,stroke:#f97316,color:#0f172a
  class ui,apiServices frontend
  class taskEdge,sprintEdge,workspaceEdge,rpcGateway,taskRpc,workspaceRpc,permissions service
  class tables,events,jobs data

  legendFrontend["Leyenda: frontend"]:::frontend
  legendService["Leyenda: servicio/RPC"]:::service
  legendData["Leyenda: datos/eventos"]:::data
```

## D5 - Realtime, Notifications And Automations Domain

```mermaid
flowchart LR
  subgraph client["Cliente / navegador"]
    layout["Layout<br/>menu notificaciones"]
    boardHook["useBoardManager<br/>recarga tablero"]
    projectUi["Project Settings<br/>automation builder"]
    rtHelper["realtimeChannels.ts<br/>nombres unicos + cleanup"]
  end

  subgraph realtimePublic["Supabase Realtime publico"]
    ws["Realtime Gateway<br/>WebSocket postgres_changes"]
  end

  subgraph postgresBoundary["Postgres eventos"]
    pub["supabase_realtime publication<br/>tasks/notifications/invitations/events/rules/runs"]
    tasks["tasks<br/>cambios de tablero"]
    notifications["user_notifications<br/>notificaciones internas"]
    invitations["organization/project invitations<br/>pendientes"]
    activity["activity_events<br/>eventos de dominio"]
    rules["automation_rules<br/>reglas"]
    runs["automation_runs<br/>historial"]
    autoTrigger["evaluate_automation_rules_after_activity_event<br/>trigger SQL"]
    notifyFn["create_user_notification<br/>factory SQL"]
    jobs["command_jobs<br/>automation.email/webhook"]
  end

  layout -->|WebSocket subscribe, JWT| rtHelper
  boardHook -->|WebSocket subscribe, JWT| rtHelper
  projectUi -->|WebSocket subscribe, JWT| rtHelper
  rtHelper -->|WebSocket channel topic| ws
  pub -.->|postgres_changes stream| ws

  tasks -.->|published row change| pub
  notifications -.->|published row change| pub
  invitations -.->|published row change| pub
  activity -.->|published row change| pub
  rules -.->|published row change| pub
  runs -.->|published row change| pub

  activity -.->|AFTER INSERT trigger| autoTrigger
  autoTrigger -->|read matching rules| rules
  autoTrigger -->|INSERT run result| runs
  autoTrigger -.->|safe action notification| notifyFn
  autoTrigger -.->|enqueue async action| jobs
  notifyFn -->|INSERT notification| notifications

  classDef frontend fill:#e8f1ff,stroke:#2f80ed,color:#0f172a
  classDef service fill:#ecfdf5,stroke:#059669,color:#0f172a
  classDef data fill:#fff7ed,stroke:#f97316,color:#0f172a
  class layout,boardHook,projectUi,rtHelper frontend
  class ws,autoTrigger,notifyFn service
  class pub,tasks,notifications,invitations,activity,rules,runs,jobs data

  legendFrontend["Leyenda: frontend"]:::frontend
  legendService["Leyenda: servicio/evento"]:::service
  legendData["Leyenda: datos publicados"]:::data
```

## D6 - Storage And Assets Domain

```mermaid
flowchart LR
  subgraph client["Cliente / navegador"]
    userSettings["UserSettingsPage<br/>avatar"]
    taskEditor["TaskDescriptionEditor<br/>imagenes de tarea"]
    projectSettings["ProjectSettingsModal<br/>banner/logo"]
    uploadHelpers["API helpers<br/>userService/imageUpload/projectService"]
  end

  subgraph storagePublic["Supabase Storage publico"]
    storageApi["Storage API<br/>upload/remove/getPublicUrl"]
  end

  subgraph storageData["Buckets confirmados"]
    avatars["avatars<br/>fotos de usuario"]
    taskImages["task-images<br/>imagenes Quill"]
    projectAssets["project-assets<br/>banners/logos"]
  end

  subgraph postgresData["Postgres metadata"]
    profiles["user_profiles<br/>avatar_url/preferences"]
    projects["projects<br/>banner_url"]
    orgs["organizations<br/>logo_url"]
  end

  userSettings -->|file input| uploadHelpers
  taskEditor -->|base64/file image| uploadHelpers
  projectSettings -->|file/cropped image| uploadHelpers
  uploadHelpers -->|HTTPS Storage upload/remove, JWT| storageApi

  storageApi -->|object write/read| avatars
  storageApi -->|object write/read| taskImages
  storageApi -->|object write/read| projectAssets

  uploadHelpers -->|HTTPS getPublicUrl| storageApi
  uploadHelpers -->|HTTPS update profile URL, JWT| profiles
  uploadHelpers -->|HTTPS update banner URL, JWT| projects
  uploadHelpers -->|HTTPS update logo URL, JWT| orgs

  classDef frontend fill:#e8f1ff,stroke:#2f80ed,color:#0f172a
  classDef service fill:#ecfdf5,stroke:#059669,color:#0f172a
  classDef data fill:#fff7ed,stroke:#f97316,color:#0f172a
  class userSettings,taskEditor,projectSettings,uploadHelpers frontend
  class storageApi service
  class avatars,taskImages,projectAssets,profiles,projects,orgs data

  legendFrontend["Leyenda: frontend/helper"]:::frontend
  legendService["Leyenda: servicio Storage"]:::service
  legendData["Leyenda: datos/assets"]:::data
```

## D7 - Jobs, Cron And Reports Domain

```mermaid
flowchart LR
  subgraph postgresBoundary["Postgres interno"]
    commands["SQL commands<br/>create/assign/complete/workspace"]
    outbox["command_jobs<br/>queue_name/job_type/status"]
    reportFn["generate_sprint_report<br/>snapshot backend"]
    reports["sprint_reports<br/>historicos"]
    maintenance["run_command_job_maintenance<br/>reset stale locks"]
    deadlines["scan_sprint_deadlines<br/>due soon/overdue notifications"]
    cron["pg_cron<br/>scheduled SQL"]
    notifications["user_notifications<br/>deadline notifications"]
  end

  subgraph edgeBoundary["Supabase Edge Runtime"]
    worker["job-worker<br/>service role + worker secret"]
  end

  commands -.->|enqueue_command_job| outbox
  commands -->|complete_sprint_command calls| reportFn
  reportFn -->|INSERT/UPSERT snapshot| reports
  reportFn -.->|enqueue report.sprint_completed| outbox

  cron -.->|every 5 min SQL| maintenance
  cron -.->|daily SQL| deadlines
  maintenance -->|reset_stale_command_jobs| outbox
  deadlines -->|create_user_notification| notifications

  worker -->|HTTPS RPC reset_stale_command_jobs| maintenance
  worker -->|HTTPS RPC claim_command_jobs| outbox
  worker -->|HTTPS RPC complete/fail job| outbox

  classDef service fill:#ecfdf5,stroke:#059669,color:#0f172a
  classDef data fill:#fff7ed,stroke:#f97316,color:#0f172a
  classDef workerClass fill:#e8f1ff,stroke:#2f80ed,color:#0f172a
  class commands,reportFn,maintenance,deadlines,cron service
  class outbox,reports,notifications data
  class worker workerClass

  legendWorker["Leyenda: worker"]:::workerClass
  legendService["Leyenda: funcion SQL/cron"]:::service
  legendData["Leyenda: tabla persistente"]:::data
```

## Df - Critical Data Flow

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuario
  participant SPA as React SPA
  participant SDK as Supabase JS Client
  participant RPC as PostgREST RPC
  participant DB as Postgres + RLS
  participant EVT as activity_events trigger
  participant AUTO as automation engine SQL
  participant RT as Realtime WebSocket
  participant W as job-worker

  U->>SPA: Click Crear tarea
  SPA->>SDK: createTaskCommand(payload)
  SDK->>RPC: HTTPS RPC create_task_command, JWT
  RPC->>DB: Execute SECURITY DEFINER command
  DB->>DB: Validate can_edit_project and related rows
  DB->>DB: INSERT tasks with task_id_display
  DB->>EVT: INSERT activity_events task.created
  EVT->>AUTO: AFTER INSERT evaluate_automation_rules
  AUTO->>DB: SELECT enabled automation_rules by project
  AUTO->>DB: INSERT automation_runs
  AUTO->>DB: INSERT user_notifications or command_jobs
  DB-->>RPC: Return created task
  RPC-->>SDK: HTTPS response
  SDK-->>SPA: Created task data
  DB-->>RT: Publication emits tasks/user_notifications/automation_runs
  RT-->>SPA: WebSocket postgres_changes
  W-->>RPC: HTTPS RPC claim_command_jobs with service role
  RPC-->>W: Jobs claimed
  W-->>RPC: HTTPS RPC complete_command_job or fail_command_job
```

## De - Data Model

```mermaid
erDiagram
  ORGANIZATIONS {
    uuid id PK
    text name
    text logo_url
    uuid created_by
    timestamptz created_at
    timestamptz updated_at
  }

  ORGANIZATION_MEMBERS {
    uuid id PK
    uuid organization_id FK
    uuid user_id
    text role
    timestamptz created_at
  }

  ORGANIZATION_INVITATIONS {
    uuid id PK
    uuid organization_id FK
    uuid invited_by
    uuid invitee_id
    text invitee_email
    text status
    timestamptz created_at
  }

  PROJECTS {
    uuid id PK
    uuid organization_id FK
    uuid user_id
    text title
    text project_key
    text visibility
    integer task_sequence
    integer epic_sequence
    boolean allow_board_task_creation
    text banner_url
  }

  PROJECT_MEMBERS {
    uuid id PK
    uuid project_id FK
    uuid user_id
    text role
    timestamptz created_at
  }

  PROJECT_INVITATIONS {
    uuid id PK
    uuid project_id FK
    uuid invited_by
    uuid invitee_id
    text invitee_email
    text status
  }

  COLUMNS {
    uuid id PK
    uuid project_id FK
    text name
    integer position
  }

  COLUMN_ORDER {
    uuid id PK
    uuid project_id FK
    jsonb column_ids
  }

  TASKS {
    uuid id PK
    uuid project_id FK
    uuid column_id FK
    uuid sprint_id FK
    uuid epic_id FK
    text task_id_display
    text title
    boolean in_backlog
    uuid issue_type_id FK
    uuid priority_id FK
    text story_points
    uuid assignee_id
  }

  EPICS {
    uuid id PK
    uuid project_id FK
    text epic_id_display
    text name
    text color
    date start_date
    date end_date
  }

  SPRINTS {
    uuid id PK
    uuid project_id FK
    text name
    text status
    date start_date
    date end_date
  }

  TASK_DEPENDENCIES {
    uuid id PK
    uuid task_id FK
    uuid depends_on_task_id FK
    text dependency_type
  }

  EPIC_DEPENDENCIES {
    uuid id PK
    uuid epic_id FK
    uuid depends_on_epic_id FK
    text dependency_type
  }

  ROADMAP_SETTINGS {
    uuid id PK
    uuid project_id FK
    uuid user_id
    boolean child_level_issue_scheduling
  }

  EDITOR_NOTES {
    uuid id PK
    uuid project_id FK
    uuid user_id
    text content
    boolean is_active
  }

  ACTIVITY_EVENTS {
    uuid id PK
    uuid organization_id FK
    uuid project_id FK
    uuid sprint_id FK
    uuid task_id FK
    uuid actor_id
    text event_type
    jsonb payload
    text event_key
  }

  USER_NOTIFICATIONS {
    uuid id PK
    uuid user_id
    uuid organization_id FK
    uuid project_id FK
    uuid task_id FK
    uuid sprint_id FK
    text type
    text title
    text message
    jsonb payload
    text dedupe_key
    timestamptz read_at
  }

  COMMAND_JOBS {
    uuid id PK
    text queue_name
    text job_type
    jsonb payload
    text status
    text job_key
    integer attempts
    timestamptz available_at
    timestamptz locked_at
  }

  AUTOMATION_RULES {
    uuid id PK
    uuid organization_id FK
    uuid project_id FK
    text name
    boolean enabled
    text trigger_event
    jsonb conditions
    jsonb actions
    uuid created_by
    timestamptz last_run_at
  }

  AUTOMATION_RUNS {
    uuid id PK
    uuid rule_id FK
    uuid organization_id FK
    uuid project_id FK
    uuid activity_event_id FK
    text status
    text event_type
    jsonb result
  }

  SPRINT_REPORTS {
    uuid id PK
    uuid project_id FK
    uuid sprint_id FK
    text report_type
    jsonb snapshot
    integer total_tasks
    integer completed_tasks
    numeric completion_rate
  }

  USER_PROFILES {
    uuid id PK
    text full_name
    text avatar_url
    jsonb preferences
  }

  ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : has
  ORGANIZATIONS ||--o{ ORGANIZATION_INVITATIONS : sends
  ORGANIZATIONS ||--o{ PROJECTS : contains
  ORGANIZATIONS ||--o{ ACTIVITY_EVENTS : scopes
  ORGANIZATIONS ||--o{ AUTOMATION_RULES : owns

  PROJECTS ||--o{ PROJECT_MEMBERS : has
  PROJECTS ||--o{ PROJECT_INVITATIONS : invites
  PROJECTS ||--o{ COLUMNS : has
  PROJECTS ||--o{ COLUMN_ORDER : orders
  PROJECTS ||--o{ TASKS : contains
  PROJECTS ||--o{ EPICS : contains
  PROJECTS ||--o{ SPRINTS : contains
  PROJECTS ||--o{ ROADMAP_SETTINGS : configures
  PROJECTS ||--o{ EDITOR_NOTES : documents
  PROJECTS ||--o{ ACTIVITY_EVENTS : emits
  PROJECTS ||--o{ USER_NOTIFICATIONS : notifies
  PROJECTS ||--o{ AUTOMATION_RULES : configures
  PROJECTS ||--o{ AUTOMATION_RUNS : records
  PROJECTS ||--o{ SPRINT_REPORTS : reports

  COLUMNS ||--o{ TASKS : groups
  SPRINTS ||--o{ TASKS : plans
  EPICS ||--o{ TASKS : groups
  TASKS ||--o{ TASK_DEPENDENCIES : depends
  EPICS ||--o{ EPIC_DEPENDENCIES : depends

  TASKS ||--o{ ACTIVITY_EVENTS : emits
  SPRINTS ||--o{ ACTIVITY_EVENTS : emits
  TASKS ||--o{ USER_NOTIFICATIONS : references
  SPRINTS ||--o{ USER_NOTIFICATIONS : references

  AUTOMATION_RULES ||--o{ AUTOMATION_RUNS : produces
  ACTIVITY_EVENTS ||--o{ AUTOMATION_RUNS : triggers
  SPRINTS ||--o{ SPRINT_REPORTS : snapshots
```

## Unconfirmed

- Payments are not confirmed.
- A real email provider is not confirmed.
- External webhook delivery by the worker is not confirmed.
- Kafka or another external broker is not implemented.
- VPC/private network boundaries are not confirmed.
- Netlify Functions are not confirmed.
- Internal TLS termination inside Netlify or Supabase is not confirmed.
- External Google Console and Supabase dashboard configuration are not confirmed.
