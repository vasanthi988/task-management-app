import os
import base64
from email.mime.text import MIMEText

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase environment variables are missing")

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
)

app = Flask(__name__)

CORS(app)
def get_current_user():
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return None

    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1]

    try:
        response = supabase.auth.get_user(token)
        return response.user
    except Exception:
        return None

@app.route("/")
def home():
    return jsonify({
        "message": "Task Management API is running"
    })

@app.route("/health")
def health():
    try:
        response = supabase.table("users").select("id").limit(1).execute()

        return jsonify({
            "status": "success",
            "message": "Flask connected to Supabase"
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/api/users", methods=["GET"])
def get_users():
    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "error": "Unauthorized"
        }), 401

    try:
        response = supabase.table("users").select("*").execute()

        return jsonify({
            "users": response.data
        }),200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500
@app.route("/api/users", methods=["POST"])
def create_user():
    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "error": "Unauthorized"
        }), 401

    try:
        data = request.get_json()

        user_id = data.get("id")
        name = data.get("name")
        email = data.get("email")
        google_id = data.get("google_id")
        avatar_url = data.get("avatar_url")

        if not user_id or not name or not email:
            return jsonify({
                "error": "id, name and email are required"
            }), 400

        response = supabase.table("users").upsert({
            "id": user_id,
            "name": name,
            "email": email,
            "google_id": google_id,
            "avatar_url": avatar_url
        }).execute()

        return jsonify({
            "message": "User created successfully",
            "user": response.data
        }), 201

    except Exception as e:
        print("CREATE USER ERROR:", e)

        return jsonify({
            "error": str(e)
        }), 500
def send_gmail_email(access_token, to_email, subject, body):
    try:
        credentials = Credentials(token=access_token)

        service = build(
            "gmail",
            "v1",
            credentials=credentials
        )

        message = MIMEText(body)
        message["to"] = to_email
        message["subject"] = subject

        raw_message = base64.urlsafe_b64encode(
            message.as_bytes()
        ).decode()

        service.users().messages().send(
            userId="me",
            body={"raw": raw_message}
        ).execute()

        print("EMAIL SENT SUCCESSFULLY")
        return True

    except Exception as e:
        print("GMAIL ERROR:", e)
        return False
@app.route("/api/tasks", methods=["POST"])
def create_task():
    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "error": "Unauthorized"
        }), 401

    try:
        data = request.get_json()

        title = data.get("title")
        description = data.get("description")
        assigned_to = data.get("assigned_to")
        google_access_token = data.get("google_access_token")

        if not title:
            return jsonify({
                "error": "Task title is required"
            }), 400

        response = supabase.table("tasks").insert({
            "title": title,
            "description": description,
            "created_by": current_user.id,
            "assigned_to": assigned_to,
            "status": "pending"
        }).execute()

        # Send email to the assigned user
        if assigned_to and google_access_token:
            assigned_user = supabase.table("users") \
                .select("email, name") \
                .eq("id", assigned_to) \
                .single() \
                .execute()

            if assigned_user.data:
                send_gmail_email(
                    google_access_token,
                    assigned_user.data["email"],
                    "New Task Assigned",
                    f"""Hello {assigned_user.data["name"]},

You have been assigned a new task.

Task: {title}

Description: {description or "No description provided"}

Please log in to the Task Management App to view the task.

Thank you.
"""
                )

        return jsonify({
            "message": "Task created successfully",
            "task": response.data
        }), 201

    except Exception as e:
        print("CREATE TASK ERROR:", e)

        return jsonify({
            "error": str(e)
        }), 500
@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "error": "Unauthorized"
        }), 401

    try:
        response = supabase.table("tasks") \
            .select("*") \
            .or_(
                f"created_by.eq.{current_user.id},"
                f"assigned_to.eq.{current_user.id}"
            ) \
            .order("created_at", desc=True) \
            .execute()

        return jsonify({
            "tasks": response.data
        }), 200

    except Exception as e:
        print("GET TASKS ERROR:", e)

        return jsonify({
            "error": str(e)
        }), 500
@app.route("/api/tasks/<task_id>/complete", methods=["PUT"])
def complete_task(task_id):
    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "error": "Unauthorized"
        }), 401

    try:
        data = request.get_json() or {}

        google_access_token = data.get("google_access_token")

        task_response = supabase.table("tasks") \
            .select("*") \
            .eq("id", task_id) \
            .single() \
            .execute()

        task = task_response.data

        if not task:
            return jsonify({
                "error": "Task not found"
            }), 404

        response = supabase.table("tasks") \
            .update({
                "status": "completed"
            }) \
            .eq("id", task_id) \
            .execute()

        if google_access_token and task.get("created_by"):
            creator = supabase.table("users") \
                .select("email, name") \
                .eq("id", task["created_by"]) \
                .single() \
                .execute()

            if creator.data:
                send_gmail_email(
                    google_access_token,
                    creator.data["email"],
                    "Task Completed",
                    f"""Hello {creator.data["name"]},

The following task has been completed:

Task: {task["title"]}

Description: {task.get("description") or "No description provided"}

The task status has been updated to completed.

Thank you.
"""
                )

        return jsonify({
            "message": "Task completed successfully",
            "task": response.data
        }), 200

    except Exception as e:
        print("COMPLETE TASK ERROR:", e)

        return jsonify({
            "error": str(e)
        }), 500
    
if __name__ == "__main__":
    app.run(debug=True)

print(app.url_map)