import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"]}}, 
     supports_credentials=True)

# Инициализация клиента Supabase через переменные окружения
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("⚠️ WARNING: SUPABASE_URL or SUPABASE_KEY not set!")
    supabase = None
else:
    supabase = create_client(supabase_url, supabase_key)

# Health check endpoint для Render
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

# === API: Регистрация ===
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
        
    hashed_password = generate_password_hash(password)
    
    try:
        response = supabase.table("custom_users").insert({
            "username": username,
            "password": hashed_password
        }).execute()
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        return jsonify({"error": "Username already exists or DB error"}), 400

# === API: Авторизация ===
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    response = supabase.table("custom_users").select("*").eq("username", username).execute()
    users = response.data
    
    if users and check_password_hash(users[0]['password'], password):
        return jsonify({
            "message": "Success", 
            "user_id": users[0]['id'], 
            "username": username
        })
        
    return jsonify({"error": "Invalid credentials"}), 401

# === API: Получить треки пользователя ===
@app.route('/api/tracks', methods=['GET'])
def get_tracks():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    response = supabase.table("tracks").select("*").eq("user_id", user_id).execute()
    
    # Формируем список с прямыми ссылками на аудио в Supabase
    tracks_list = []
    for item in response.data:
        # Генерируем публичную ссылку из хранилища Supabase
        public_url = supabase.storage.from_("tracks").get_public_url(item['storage_path'])
        tracks_list.append({
            "filename": item['filename'],
            "url": public_url
        })
        
    return jsonify(tracks_list)

# === API: Загрузить трек ===
@app.route('/api/upload', methods=['POST'])
def upload_track():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
        
    file = request.files['file']
    if file and file.filename.endswith('.mp3'):
        file_bytes = file.read()
        storage_path = f"user_{user_id}/{file.filename}"
        
        try:
            # 1. Загружаем файл напрямую в Supabase Storage
            supabase.storage.from_("tracks").upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": "audio/mpeg"}
            )
            
            # 2. Делаем запись в таблицу базы данных
            supabase.table("tracks").insert({
                "user_id": user_id,
                "filename": file.filename,
                "storage_path": storage_path
            }).execute()
            
            return jsonify({"message": "Success"})
        except Exception as e:
            return jsonify({"error": f"Upload failed: {str(e)}"}), 500
        
    return jsonify({"error": "Invalid file type"}), 400


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 7860))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host='0.0.0.0', port=port, debug=debug)