#!/usr/bin/env node

/**
 * Todo Manager for StringRay Framework
 * Provides file-based JSON todo management
 * Compatible with both CommonJS and ES modules
 */

const fs = require("fs");
const path = require("path");

const __filename = __filename;
const __dirname = path.dirname(__filename);

class TodoManager {
  constructor(todoFilePath = ".todos.json") {
    this.todoFilePath = todoFilePath;
    this.loadTodos();
  }

  loadTodos() {
    try {
      if (fs.existsSync(this.todoFilePath)) {
        const data = fs.readFileSync(this.todoFilePath, "utf8");
        this.todos = JSON.parse(data);
      } else {
        this.todos = [];
      }
    } catch (error) {
      console.error("Failed to load todos:", error.message);
      this.todos = [];
    }
  }

  saveTodos() {
    try {
      fs.writeFileSync(this.todoFilePath, JSON.stringify(this.todos, null, 2));
    } catch (error) {
      console.error("Failed to save todos:", error.message);
    }
  }

  createTodo(description, priority = "medium") {
    const newTodo = {
      id: Date.now().toString(),
      uuid: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      subject: description,
      projects: [],
      contexts: [],
      due: null,
      completed: false,
      completedDate: "",
      archived: false,
      isPriority: priority === "high" || priority === "critical",
      notes: [],
    };

    this.todos.push(newTodo);
    this.saveTodos();

    console.log(`✅ Todo created: ${description}`);
    return newTodo;
  }

  completeTodo(todoId) {
    const todo = this.todos.find((t) => t.id === todoId || t.uuid === todoId);
    if (todo) {
      todo.completed = true;
      todo.completedDate = new Date().toISOString();
      this.saveTodos();
      console.log(`✅ Todo completed: ${todo.subject}`);
      return true;
    }
    return false;
  }

  listTodos() {
    console.log("📋 Current Todos:");
    console.log("================");

    const activeTodos = this.todos.filter((t) => !t.completed && !t.archived);
    const completedTodos = this.todos.filter((t) => t.completed && !t.archived);

    if (activeTodos.length > 0) {
      console.log("\n🔄 Active Todos:");
      activeTodos.forEach((todo) => {
        const priority = todo.isPriority ? "🔴" : "🔵";
        console.log(`  ${priority} [${todo.id}] ${todo.subject}`);
      });
    }

    if (completedTodos.length > 0) {
      console.log("\n✅ Completed Todos:");
      completedTodos.forEach((todo) => {
        console.log(`  ✅ [${todo.id}] ${todo.subject}`);
      });
    }

    if (activeTodos.length === 0 && completedTodos.length === 0) {
      console.log("\n📝 No todos found. Use createTodo() to add one!");
    }
  }

  getStats() {
    const total = this.todos.length;
    const completed = this.todos.filter((t) => t.completed).length;
    const pending = total - completed;

    return {
      total,
      completed,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}

// Export functions for agent use (ES module compatible)
export function createTodo(description, priority = "medium") {
  const todoManager = new TodoManager();
  return todoManager.createTodo(description, priority);
}

export function completeTodo(todoId) {
  const todoManager = new TodoManager();
  return todoManager.completeTodo(todoId);
}

export function listTodos() {
  const todoManager = new TodoManager();
  return todoManager.listTodos();
}

export function getTodoStats() {
  const todoManager = new TodoManager();
  return todoManager.getStats();
}

// CLI interface for direct usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const description = args.slice(1).join(" ");

  const todoManager = new TodoManager();

  switch (command) {
    case "create":
      if (description) {
        todoManager.createTodo(description);
      } else {
        console.error("Usage: node todo-manager.js create <description>");
        process.exit(1);
      }
      break;

    case "complete":
      if (description) {
        const success = todoManager.completeTodo(description);
        if (!success) {
          console.error(`Todo with ID "${description}" not found`);
          process.exit(1);
        }
      } else {
        console.error("Usage: node todo-manager.js complete <todo-id>");
        process.exit(1);
      }
      break;

    case "list":
      todoManager.listTodos();
      break;

    case "stats":
      const stats = todoManager.getStats();
      console.log(
        `📊 Todo Stats: ${stats.completed}/${stats.total} completed (${stats.completionRate}%)`,
      );
      break;

    default:
      console.log("Available commands:");
      console.log("  create <description>  - Create a new todo");
      console.log("  complete <todo-id>  - Mark todo as completed");
      console.log("  list                 - List all todos");
      console.log("  stats                - Show todo statistics");
      process.exit(0);
  }
}
