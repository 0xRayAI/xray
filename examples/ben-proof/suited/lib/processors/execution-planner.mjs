/**
 * Execution Planner — ported from xray src/mcps/orchestrator/execution/execution-planner.ts
 * Creates optimized execution plans for orchestration tasks (wear intake uses validateTasks + calculateTaskComplexity).
 */
import { getAgentCapabilitiesManager } from './agent-capabilities.mjs';
import { getProvider, toMemoryTask, fromMemoryTask } from './memory-routing-bridge.mjs';

export function dependencyCount(deps) {
  if (deps == null) return 0;
  if (typeof deps === 'number' && Number.isFinite(deps)) {
    return Math.max(0, Math.round(deps));
  }
  if (Array.isArray(deps)) return deps.length;
  return 0;
}

function isDependencyIdList(deps) {
  return Array.isArray(deps) && deps.length > 0;
}

export class ExecutionPlanner {
  constructor() {
    this.capabilitiesManager = getAgentCapabilitiesManager();
  }

  validateTasks(tasks) {
    const errors = [];
    if (!tasks || tasks.length === 0) {
      errors.push('No tasks provided');
      return { valid: false, errors };
    }
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (!task) continue;
      if (!task.id) errors.push(`Task ${i}: Missing required field 'id'`);
      if (!task.description) errors.push(`Task ${i}: Missing required field 'description'`);
      if (!task.type) errors.push(`Task ${i}: Missing required field 'type'`);
      if (isDependencyIdList(task.dependencies) && task.id) {
        const taskIds = new Set(tasks.map((t) => t.id).filter(Boolean));
        for (const depId of task.dependencies) {
          if (!taskIds.has(depId)) {
            errors.push(`Task ${i}: Dependency '${depId}' does not exist`);
          }
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  async createExecutionPlan(tasks, executionMode) {
    const provider = getProvider();
    const memoryTasks = provider.enrichTasks ? provider.enrichTasks(tasks.map(toMemoryTask)) : tasks.map(toMemoryTask);
    const enrichedTasks = memoryTasks.map(fromMemoryTask);
    const agentAssignments = new Map();
    switch (executionMode) {
      case 'parallel':
        this.createParallelPlan(enrichedTasks, agentAssignments);
        break;
      case 'sequential':
        this.createSequentialPlan(enrichedTasks, agentAssignments);
        break;
      case 'optimized':
      default:
        await this.createOptimizedPlan(enrichedTasks, agentAssignments);
        break;
    }
    const estimatedDuration = this.estimateExecutionDuration(agentAssignments);
    const plan = {
      tasks: enrichedTasks,
      strategy: executionMode,
      agentAssignments,
      estimatedDuration,
    };
    if (provider.id !== 'null' && typeof provider.buildInheritedContext === 'function') {
      plan.memoryContext = { ...provider.buildInheritedContext(memoryTasks) };
    }
    return plan;
  }

  createParallelPlan(tasks, agentAssignments) {
    const agents = this.capabilitiesManager.getAllCapabilities();
    let agentIndex = 0;
    const agentList = Array.from(agents.keys()).filter(Boolean);
    if (agentList.length === 0) return;
    for (const task of tasks) {
      const agent = agentList[agentIndex % agentList.length];
      if (!agentAssignments.has(agent)) agentAssignments.set(agent, []);
      agentAssignments.get(agent).push(task);
      agentIndex++;
    }
  }

  createSequentialPlan(tasks, agentAssignments) {
    agentAssignments.set('orchestrator', [...tasks]);
  }

  async createOptimizedPlan(tasks, agentAssignments) {
    const sortedTasks = this.sortByDependencies(tasks);
    const independentTasks = [];
    const dependentTasks = [];
    for (const task of sortedTasks) {
      if (isDependencyIdList(task.dependencies)) dependentTasks.push(task);
      else independentTasks.push(task);
    }
    this.assignTasksToAgents(independentTasks, agentAssignments);
    this.assignTasksToAgents(dependentTasks, agentAssignments);
  }

  sortByDependencies(tasks) {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const sorted = [];
    const visited = new Set();
    const visit = (task) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);
      if (isDependencyIdList(task.dependencies)) {
        for (const depId of task.dependencies) {
          const depTask = taskMap.get(depId);
          if (depTask) visit(depTask);
        }
      }
      sorted.push(task);
    };
    for (const task of tasks) visit(task);
    return sorted;
  }

  assignTasksToAgents(tasks, agentAssignments) {
    for (const task of tasks) {
      const complexity = this.calculateTaskComplexity(task);
      const requiredCaps = [task.type, ...(task.metadata?.memorySignals ?? [])];
      const operationDescription = task.metadata?.memoryHighConfidenceTrap
        ? `${task.description} TYPE: ontological-trap`
        : task.description;
      const agent =
        this.capabilitiesManager.selectAgentForTask(
          requiredCaps,
          complexity,
          operationDescription,
          task.type,
        ) || 'orchestrator';
      if (!agentAssignments.has(agent)) agentAssignments.set(agent, []);
      agentAssignments.get(agent).push(task);
    }
  }

  estimateExecutionDuration(agentAssignments) {
    let maxDuration = 0;
    for (const [agent, tasks] of agentAssignments) {
      const caps = this.capabilitiesManager.getCapabilities(agent);
      if (!caps) continue;
      const batches = Math.ceil(tasks.length / caps.concurrentTasks);
      const taskDuration = tasks.reduce((sum, t) => sum + (t.estimatedComplexity || 30) * 10, 0);
      const agentDuration = batches * (taskDuration / Math.max(tasks.length, 1));
      maxDuration = Math.max(maxDuration, agentDuration);
    }
    return Math.round(maxDuration);
  }

  async analyzeTaskComplexity(tasks) {
    const taskComplexity = [];
    const agentAssignments = [];
    const assignments = new Map();
    for (const task of tasks) {
      const complexity = this.calculateTaskComplexity(task);
      taskComplexity.push({ complexity, category: task.type });
      const requiredCaps = [task.type, ...(task.metadata?.memorySignals ?? [])];
      const agent =
        this.capabilitiesManager.selectAgentForTask(requiredCaps, complexity, task.description, task.type) ||
        'orchestrator';
      if (!assignments.has(agent)) assignments.set(agent, []);
      assignments.get(agent).push(task);
    }
    for (const [agent, assignedTasks] of assignments) {
      const caps = this.capabilitiesManager.getCapabilities(agent);
      const utilization = caps ? Math.round((assignedTasks.length / caps.concurrentTasks) * 100) : 100;
      agentAssignments.push({
        agent,
        taskCount: assignedTasks.length,
        utilization: Math.min(utilization, 100),
      });
    }
    const overallComplexity =
      taskComplexity.length > 0
        ? Math.round(taskComplexity.reduce((sum, t) => sum + t.complexity, 0) / taskComplexity.length)
        : 0;
    return {
      overallComplexity,
      recommendedStrategy: this.recommendStrategy(overallComplexity, tasks.length),
      taskComplexity,
      agentAssignments,
      estimatedDuration: this.estimateExecutionDuration(assignments),
      parallelPotential: this.calculateParallelPotential(tasks),
    };
  }

  calculateTaskComplexity(task) {
    let complexity = 30;
    switch (task.priority) {
      case 'critical':
        complexity += 20;
        break;
      case 'high':
        complexity += 10;
        break;
      case 'low':
        complexity -= 5;
        break;
      default:
        break;
    }
    if (task.estimatedComplexity) {
      complexity = (complexity + task.estimatedComplexity) / 2;
    }
    complexity += dependencyCount(task.dependencies) * 5;
    if (task.metadata?.memoryComplexityBoost !== undefined) {
      complexity += task.metadata.memoryComplexityBoost;
    } else {
      const provider = getProvider();
      if (provider.id !== 'null' && typeof provider.getTaskConfidence === 'function') {
        complexity += provider.getTaskConfidence(toMemoryTask(task)).complexityBoost ?? 0;
      }
    }
    return Math.min(Math.max(Math.round(complexity), 1), 100);
  }

  recommendStrategy(overallComplexity, taskCount) {
    if (taskCount <= 1) return 'sequential';
    if (overallComplexity > 70) return 'sequential';
    if (overallComplexity < 30 && taskCount > 3) return 'parallel';
    return 'optimized';
  }

  calculateParallelPotential(tasks) {
    const independent = tasks.filter((t) => !isDependencyIdList(t.dependencies));
    return tasks.length ? independent.length / tasks.length : 0;
  }
}

let executionPlannerInstance = null;

export function getExecutionPlanner() {
  if (!executionPlannerInstance) {
    executionPlannerInstance = new ExecutionPlanner();
  }
  return executionPlannerInstance;
}

export function resetExecutionPlanner() {
  executionPlannerInstance = null;
}
