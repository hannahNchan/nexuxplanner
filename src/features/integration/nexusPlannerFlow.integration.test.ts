import { beforeAll, afterEach, describe, expect, it } from "vitest";
import { supabase } from "../../lib/supabase";
import { createProject, deleteProject, type ProjectWithTags } from "../api/projectService";
import { createOrganization } from "../api/organizationService";
import { createEpic, createRoadmapTaskForEpic, fetchEpics } from "../api/epicService";
import { fetchBacklogTasks } from "../api/backlogService";
import { fetchBoardDataByProject, updateTask } from "../api/boardService";
import {
  assignTasksToSprint,
  createSprint,
  fetchSprintTasks,
  fetchSprintWithStats,
} from "../api/sprintService";

const testEmail = process.env.NEXUS_TEST_USER_EMAIL;
const testPassword = process.env.NEXUS_TEST_USER_PASSWORD;
const testAccessToken = process.env.NEXUS_TEST_ACCESS_TOKEN;
const testRefreshToken = process.env.NEXUS_TEST_REFRESH_TOKEN;
const hasPasswordCredentials = Boolean(testEmail && testPassword);
const hasSessionTokens = Boolean(testAccessToken && testRefreshToken);
const runIntegration = hasPasswordCredentials || hasSessionTokens ? describe : describe.skip;

const uniqueProjectKey = () =>
  `IT${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random()
    .toString(36)
    .toUpperCase()
    .slice(2, 4)}`.slice(0, 10);

const createIntegrationProject = async (userId: string, organizationId: string, title: string) =>
  createProject(userId, {
    title,
    description: "Proyecto temporal de prueba de integración",
    project_key: uniqueProjectKey(),
    organization_id: organizationId,
    tags: ["integration"],
  });

const findColumn = (
  columns: Array<{ id: string; name: string; position: number }>,
  matcher: (name: string) => boolean
) => columns.find((column) => matcher(column.name));

runIntegration("NexusPlanner critical integration flow", () => {
  const createdProjects: ProjectWithTags[] = [];
  let userId = "";

  beforeAll(async () => {
    const { data, error } = hasSessionTokens
      ? await supabase.auth.setSession({
          access_token: testAccessToken!,
          refresh_token: testRefreshToken!,
        })
      : await supabase.auth.signInWithPassword({
          email: testEmail!,
          password: testPassword!,
        });

    if (error) throw error;
    if (!data.user) throw new Error("No se pudo iniciar sesión con el usuario de integración.");

    userId = data.user.id;
  });

  afterEach(async () => {
    while (createdProjects.length > 0) {
      const project = createdProjects.pop();
      if (!project) continue;

      await deleteProject(project.id);
    }
  });

  it("creates project -> epic -> roadmap task -> backlog -> sprint and isolates projects", async () => {
    const organization = await createOrganization(
      userId,
      `Integration ${Date.now().toString(36)}`
    );
    const projectA = await createIntegrationProject(userId, organization.id, "Integration Flow A");
    const projectB = await createIntegrationProject(userId, organization.id, "Integration Flow B");
    createdProjects.push(projectA, projectB);

    const boardA = await fetchBoardDataByProject(userId, projectA.id);
    expect(boardA.columns).toHaveLength(4);
    expect(boardA.columnOrder).toHaveLength(4);

    const firstColumnA = findColumn(boardA.columns, () => true);
    const doneColumnA = findColumn(boardA.columns, (name) =>
      ["hecho", "done"].includes(name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase())
    );

    expect(firstColumnA).toBeDefined();
    expect(doneColumnA).toBeDefined();

    const epicA = await createEpic(userId, {
      project_id: projectA.id,
      name: "Flujo crítico A",
      color: "#3385F0",
    });
    const epicB = await createEpic(userId, {
      project_id: projectB.id,
      name: "Flujo crítico B",
      color: "#099F69",
    });

    const taskA = await createRoadmapTaskForEpic(projectA.id, epicA.id, "Tarea desde roadmap A");
    const taskB = await createRoadmapTaskForEpic(projectB.id, epicB.id, "Tarea desde roadmap B");

    await updateTask(projectA.id, taskA.id, { story_points: "8" });
    await updateTask(projectB.id, taskB.id, { story_points: "13" });

    const roadmapA = await fetchEpics(userId, projectA.id);
    expect(roadmapA.map((epic) => epic.id)).toContain(epicA.id);
    expect(roadmapA.map((epic) => epic.id)).not.toContain(epicB.id);
    expect(roadmapA.flatMap((epic) => epic.connected_tasks ?? []).map((task) => task.id)).toContain(taskA.id);
    expect(roadmapA.flatMap((epic) => epic.connected_tasks ?? []).map((task) => task.id)).not.toContain(taskB.id);

    const backlogA = await fetchBacklogTasks(userId, projectA.id);
    expect(backlogA.map((task) => task.id)).toContain(taskA.id);
    expect(backlogA.map((task) => task.id)).not.toContain(taskB.id);
    expect(backlogA.find((task) => task.id === taskA.id)).toMatchObject({
      project_id: projectA.id,
      epic_id: epicA.id,
    });

    const sprintA = await createSprint(projectA.id, {
      name: "Sprint integración",
      goal: "Validar flujo crítico",
      start_date: "2026-07-17T00:00:00.000Z",
      end_date: "2026-07-31T00:00:00.000Z",
    });

    await assignTasksToSprint(projectA.id, sprintA.id, [taskA.id]);

    const backlogAfterSprint = await fetchBacklogTasks(userId, projectA.id);
    expect(backlogAfterSprint.map((task) => task.id)).not.toContain(taskA.id);

    const sprintTasks = await fetchSprintTasks(projectA.id, sprintA.id);
    expect(sprintTasks.map((task) => task.id)).toContain(taskA.id);
    expect(sprintTasks.map((task) => task.id)).not.toContain(taskB.id);

    await updateTask(projectA.id, taskA.id, {
      column_id: doneColumnA!.id,
      in_backlog: false,
    });

    const sprintStats = await fetchSprintWithStats(projectA.id, sprintA.id);
    expect(sprintStats).toMatchObject({
      total_tasks: 1,
      completed_tasks: 1,
      total_story_points: 8,
      completed_story_points: 8,
    });
  });
});
