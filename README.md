# Visual Gallery App

A Django gallery app to upload images, tag them, search by text, filter by tags, open a detail page with similar images, and manage content (edit/delete).

## Tech Stack

- Python 3.13
- Django 6
- SQLite (default)

## Project Structure

- `manage.py`: Django entrypoint
- `imgs/`: Django project settings/urls
- `gallery/`: Main app (models, views, templates, static, fixtures)
- `media/`: Uploaded files served in development
- `sample_images/`: Local sample source images (renamed from `img/`)

## Run Locally

1. Create and activate a virtual environment (if needed), then install dependencies:

```powershell
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Apply migrations:

```powershell
python manage.py migrate
```

3. Start the development server:

```powershell
python manage.py runserver
```

4. Open:

- Home: `http://127.0.0.1:8000/`
- Upload: `http://127.0.0.1:8000/upload/`

## Run With Docker

Build and start the app:

```powershell
docker compose up --build
```

Then open `http://127.0.0.1:8000/`.

Docker runs migrations automatically and keeps SQLite/media files in named volumes.

## Load Dummy Data (Fixtures)

This repository includes:

- Fixture file: `gallery/fixtures/initial_data.json`
- Source sample images: `sample_images/`
- Served media copies used by fixture: `media/sample_images/`

Load dummy data:

```powershell
python manage.py loaddata gallery/fixtures/initial_data.json
```

The fixture references real files from `sample_images` by filename
(served from `media/sample_images/` in development).

### Important

If your current database already has rows with the same primary keys, `loaddata` can fail.

For a clean reset:

```powershell
Remove-Item db.sqlite3
python manage.py migrate
python manage.py loaddata gallery/fixtures/initial_data.json
```

Then run:

```powershell
python manage.py runserver
```

## Notes

- Drag and drop is supported in the upload view.
- Gallery images are draggable to other browser areas/apps (URL drag payload).
