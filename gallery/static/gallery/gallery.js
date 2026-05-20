(function () {
    var fileInput = document.getElementById("id_image_file");
    var dropZone = document.getElementById("drop-zone");
    var pickFile = document.getElementById("pick-file");

    if (!dropZone || !fileInput) return;

    if (pickFile) {
        pickFile.addEventListener("click", function () {
            fileInput.click();
        });
    }

    function attachFile(file) {
        var dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        var text = dropZone.querySelector(".drop-big");
        if (text) text.textContent = file.name;
    }

    ["dragenter", "dragover"].forEach(function (eventName) {
        dropZone.addEventListener(eventName, function (event) {
            event.preventDefault();
            dropZone.classList.add("is-dragover");
        });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
        dropZone.addEventListener(eventName, function (event) {
            event.preventDefault();
            dropZone.classList.remove("is-dragover");
        });
    });

    dropZone.addEventListener("drop", function (event) {
        var file = event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) attachFile(file);
    });
})();

(function () {
    var draggableImages = document.querySelectorAll("img[data-drag-url]");
    draggableImages.forEach(function (img) {
        img.addEventListener("dragstart", function (event) {
            var raw = img.getAttribute("data-drag-url");
            var absolute = new URL(raw, window.location.origin).toString();
            event.dataTransfer.setData("text/uri-list", absolute);
            event.dataTransfer.setData("text/plain", absolute);
            event.dataTransfer.effectAllowed = "copy";
        });
    });
})();
