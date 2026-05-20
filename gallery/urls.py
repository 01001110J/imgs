from django.urls import path

from .views import delete_image_view, edit_image_view, home_view, image_detail_view, upload_view

app_name = "gallery"

urlpatterns = [
    path("", home_view, name="home"),
    path("imagen/<int:image_id>/", image_detail_view, name="detail"),
    path("subir/", upload_view, name="upload"),
    path("editar/<int:image_id>/", edit_image_view, name="edit"),
    path("eliminar/<int:image_id>/", delete_image_view, name="delete"),
]
