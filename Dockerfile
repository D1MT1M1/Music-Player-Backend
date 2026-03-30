FROM python:3.10-slim

# Устанавливаем рабочую директорию
WORKDIR /home/user/app

# Просто переключаемся на стандартного пользователя HF (он уже имеет UID 1000)
USER 1000

# Настраиваем PATH, чтобы Python видел установленные пакеты
ENV PATH="/home/user/.local/bin:$PATH"

# Копируем и устанавливаем зависимости
COPY --chown=1000 requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Копируем остальной код
COPY --chown=1000 . .

EXPOSE 7860

CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--timeout", "120", "app:app"]