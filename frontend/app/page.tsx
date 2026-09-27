"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.provider_token) {
    localStorage.setItem("google_access_token", session.provider_token);
  }
});

type User = {
  id: string;
  name: string;
  email: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  assigned_to: string | null;
  status: string;
  created_at: string;
};

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(
    null
  );
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          return;
        }

        const user = session.user;

        setUserEmail(user.email ?? null);
        const savedGoogleToken = localStorage.getItem("google_access_token");

setGoogleAccessToken(
  session.provider_token ?? savedGoogleToken ?? null
);

        await fetch("https://task-management-app-vlyo.onrender.com/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            id: user.id,
            name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              "Google User",
            email: user.email,
            google_id: user.user_metadata?.sub || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          }),
        });

        const usersResponse = await fetch(
          "https://task-management-app-vlyo.onrender.com/api/users",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const usersData = await usersResponse.json();

        if (usersResponse.ok) {
          setUsers(usersData.users || []);
        }

        const tasksResponse = await fetch(
          "https://task-management-app-vlyo.onrender.com/api/tasks",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const tasksData = await tasksResponse.json();

        if (tasksResponse.ok) {
          setTasks(tasksData.tasks || []);
        }
      } catch (error) {
        console.error("LOAD USER DATA ERROR:", error);
      }
    };

    loadUserData();
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signOut();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000",
        scopes: "https://www.googleapis.com/auth/gmail.send",
queryParams: {
  access_type: "offline",
  prompt: "consent",
},
      },
    });

    if (error) {
      alert(error.message);
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      alert("Please enter a task title");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert("Please login first");
      return;
    }

    try {
      const response = await fetch(
        "https://task-management-app-vlyo.onrender.com/api/tasks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            title: taskTitle,
            description: taskDescription,
            assigned_to: assignedTo || null,
            google_access_token: googleAccessToken,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to create task");
        return;
      }

      alert("Task created successfully!");

      setTaskTitle("");
      setTaskDescription("");
      setAssignedTo("");

      const tasksResponse = await fetch(
        "https://task-management-app-vlyo.onrender.com/api/tasks",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const tasksData = await tasksResponse.json();

      if (tasksResponse.ok) {
        setTasks(tasksData.tasks || []);
      }
    } catch (error) {
      console.error("CREATE TASK ERROR:", error);
      alert("Unable to connect to backend");
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (completingTaskId === taskId) {
      return;
    }

    setCompletingTaskId(taskId);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert("Please login first");
      setCompletingTaskId(null);
      return;
    }

    try {
      const response = await fetch(
  `https://task-management-app-vlyo.onrender.com/api/tasks/${taskId}/complete`,
  {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      google_access_token: googleAccessToken,
    }),
  }
);
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to complete task");
        return;
      }

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: "completed",
              }
            : task
        )
      );

      alert("Task completed successfully!");
    } catch (error) {
      console.error("COMPLETE TASK ERROR:", error);
      alert("Unable to connect to backend");
    } finally {
      setCompletingTaskId(null);
    }
  };

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px 20px",
      }}
    >
      <h1>Task Management App</h1>

      {!userEmail ? (
        <div style={{ marginTop: "30px" }}>
          <p>Please login with your Google account.</p>

          <button onClick={handleGoogleLogin}>
            Login with Google
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              marginTop: "20px",
              marginBottom: "30px",
              padding: "15px",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          >
            <strong>Logged in as:</strong> {userEmail}
          </div>
          <button
  onClick={async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("google_access_token");
    window.location.reload();
  }}
>
  Sign Out
</button>

          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "20px",
              marginBottom: "30px",
            }}
          >
            <h2>Create Task</h2>

            <div style={{ marginBottom: "15px" }}>
              <label>Task Title</label>

              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Description</label>

              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Enter task description"
                rows={4}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Assign To</label>

              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                }}
              >
                <option value="">Select a user</option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <button onClick={handleCreateTask}>
              Create Task
            </button>
          </section>

          <section>
            <h2>My Tasks</h2>

            {tasks.length === 0 ? (
              <p>No tasks found.</p>
            ) : (
              <div>
                {tasks.map((task) => {
                  const assignedUser = users.find(
                    (user) => user.id === task.assigned_to
                  );

                  return (
                    <div
                      key={task.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: "10px",
                        padding: "20px",
                        marginBottom: "15px",
                      }}
                    >
                      <h3>{task.title}</h3>

                      <p>
                        <strong>Description:</strong>{" "}
                        {task.description || "No description"}
                      </p>

                      <p>
                        <strong>Status:</strong> {task.status}
                      </p>

                      <p>
                        <strong>Assigned To:</strong>{" "}
                        {assignedUser
                          ? `${assignedUser.name} (${assignedUser.email})`
                          : "Not assigned"}
                      </p>

                      {task.status !== "completed" ? (
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={completingTaskId === task.id}
                        >
                          {completingTaskId === task.id
                            ? "Completing..."
                            : "Mark as Completed"}
                        </button>
                      ) : (
                        <button disabled>Completed</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
