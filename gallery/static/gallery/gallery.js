(function () {
    var fileInput = document.getElementById("id_image_file");
    var dropZone = document.getElementById("drop-zone");
    var pickFile = document.getElementById("pick-file");

    if (dropZone && fileInput) {
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

        fileInput.addEventListener("change", function () {
            var file = fileInput.files && fileInput.files[0];
            if (file) {
                var text = dropZone.querySelector(".drop-big");
                if (text) text.textContent = file.name;
            }
        });
    }
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

(function () {
    async function copyImage(url, button) {
        var absolute = new URL(url, window.location.origin).toString();
        try {
            var response = await fetch(absolute, { credentials: "same-origin" });
            var blob = await response.blob();

            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type || "image/png"]: blob })
                ]);
                button.textContent = "Copied";
            } else {
                await navigator.clipboard.writeText(absolute);
                button.textContent = "URL Copied";
            }
        } catch (error) {
            try {
                await navigator.clipboard.writeText(absolute);
                button.textContent = "URL Copied";
            } catch (_) {
                button.textContent = "Failed";
            }
        }

        setTimeout(function () {
            button.textContent = "Copy";
        }, 1200);
    }

    document.addEventListener("click", function (event) {
        var button = event.target.closest(".copy-image-btn");
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        copyImage(button.getAttribute("data-copy-image"), button);
    });
})();

(function () {
    var form = document.getElementById("bulk-upload-form");
    var bulkInput = document.getElementById("bulk-images-input");
    var bulkDrop = document.getElementById("bulk-drop-zone");
    var bulkPick = document.getElementById("bulk-pick-file");
    var bulkHiddenFields = document.getElementById("bulk-hidden-fields");

    var modal = document.getElementById("bulk-modal");
    var preview = document.getElementById("bulk-current-preview");
    var stepLabel = document.getElementById("bulk-step-label");
    var titleInput = document.getElementById("bulk-title-input");
    var descriptionInput = document.getElementById("bulk-description-input");
    var prevBtn = document.getElementById("bulk-prev-btn");
    var nextBtn = document.getElementById("bulk-next-btn");
    var finishBtn = document.getElementById("bulk-finish-btn");
    var cancelBtn = document.getElementById("bulk-cancel-btn");

    var tagEditor = document.getElementById("bulk-tag-editor");
    var tagsInput = tagEditor ? tagEditor.querySelector(".js-bulk-tags-input") : null;
    var chipsWrap = tagEditor ? tagEditor.querySelector(".js-bulk-tag-chips") : null;
    var tagFilterInput = tagEditor ? tagEditor.querySelector(".js-bulk-tag-filter") : null;
    var allTagButtons = tagEditor ? tagEditor.querySelectorAll(".js-bulk-all-tags-list .js-bulk-add-tag") : [];

    if (!form || !bulkInput || !bulkDrop || !modal || !preview || !titleInput || !descriptionInput || !prevBtn || !nextBtn || !finishBtn || !cancelBtn || !tagEditor || !tagsInput || !chipsWrap) return;

    var filesList = [];
    var catalog = [];
    var currentIndex = 0;

    function normalize(value) {
        return (value || "").trim().toLowerCase();
    }

    function syncFileInput() {
        if (typeof DataTransfer === "undefined") return;
        var dt = new DataTransfer();
        filesList.forEach(function (file) { dt.items.add(file); });
        bulkInput.files = dt.files;
    }

    function ensureCatalogSize() {
        while (catalog.length < filesList.length) {
            catalog.push({ title: "", description: "", tags: [] });
        }
        if (catalog.length > filesList.length) {
            catalog = catalog.slice(0, filesList.length);
        }
    }

    function renderTagChips() {
        var item = catalog[currentIndex];
        chipsWrap.innerHTML = "";
        item.tags.forEach(function (tag) {
            var chip = document.createElement("span");
            chip.className = "tag-chip";
            chip.textContent = tag;

            var removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "tag-chip-remove";
            removeBtn.textContent = "x";
            removeBtn.addEventListener("click", function () {
                item.tags = item.tags.filter(function (t) { return t !== tag; });
                renderTagChips();
            });

            chip.appendChild(removeBtn);
            chipsWrap.appendChild(chip);
        });
    }

    function addTag(raw) {
        var tag = normalize(raw);
        if (!tag) return;
        var item = catalog[currentIndex];
        if (!item.tags.includes(tag)) {
            item.tags.push(tag);
            renderTagChips();
        }
    }

    function saveCurrentStep() {
        var item = catalog[currentIndex];
        item.title = titleInput.value.trim();
        item.description = descriptionInput.value.trim();
        if (tagsInput.value.trim()) {
            addTag(tagsInput.value);
            tagsInput.value = "";
        }
    }

    function renderStep() {
        ensureCatalogSize();
        if (!filesList.length) return;

        var item = catalog[currentIndex];
        preview.src = URL.createObjectURL(filesList[currentIndex]);
        titleInput.value = item.title;
        descriptionInput.value = item.description;
        tagsInput.value = "";
        renderTagChips();

        stepLabel.textContent = (currentIndex + 1) + " / " + filesList.length;
        prevBtn.disabled = currentIndex === 0;
        nextBtn.style.display = currentIndex < filesList.length - 1 ? "inline-block" : "none";
        finishBtn.style.display = currentIndex === filesList.length - 1 ? "inline-block" : "none";
    }

    function openWizard() {
        if (!filesList.length) return;
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        currentIndex = 0;
        renderStep();
    }

    function closeWizard() {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
    }

    function mergeFiles(newFiles) {
        filesList = filesList.concat(Array.from(newFiles || []));
        ensureCatalogSize();
        syncFileInput();
        openWizard();
    }

    function injectHiddenFields() {
        bulkHiddenFields.innerHTML = "";
        catalog.forEach(function (item) {
            var title = document.createElement("input");
            title.type = "hidden";
            title.name = "titles[]";
            title.value = item.title;
            bulkHiddenFields.appendChild(title);

            var description = document.createElement("input");
            description.type = "hidden";
            description.name = "descriptions[]";
            description.value = item.description;
            bulkHiddenFields.appendChild(description);

            var tags = document.createElement("input");
            tags.type = "hidden";
            tags.name = "tags[]";
            tags.value = item.tags.join(", ");
            bulkHiddenFields.appendChild(tags);
        });
    }

    if (bulkPick) {
        bulkPick.addEventListener("click", function () {
            bulkInput.click();
        });
    }

    bulkDrop.addEventListener("click", function () {
        bulkInput.click();
    });

    bulkInput.addEventListener("change", function () {
        if (bulkInput.files && bulkInput.files.length) {
            filesList = Array.from(bulkInput.files);
            ensureCatalogSize();
            openWizard();
        }
    });

    ["dragenter", "dragover"].forEach(function (eventName) {
        bulkDrop.addEventListener(eventName, function (event) {
            event.preventDefault();
            bulkDrop.classList.add("is-dragover");
        });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
        bulkDrop.addEventListener(eventName, function (event) {
            event.preventDefault();
            bulkDrop.classList.remove("is-dragover");
        });
    });

    bulkDrop.addEventListener("drop", function (event) {
        var files = event.dataTransfer.files;
        if (files && files.length) mergeFiles(files);
    });

    tagEditor.addEventListener("click", function (event) {
        var button = event.target.closest(".js-bulk-add-tag");
        if (!button) return;
        addTag(button.getAttribute("data-tag"));
    });

    tagsInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addTag(tagsInput.value);
            tagsInput.value = "";
        } else if (event.key === "Backspace" && !tagsInput.value) {
            var item = catalog[currentIndex];
            if (item.tags.length) {
                item.tags.pop();
                renderTagChips();
            }
        }
    });

    tagsInput.addEventListener("blur", function () {
        if (tagsInput.value.trim()) {
            addTag(tagsInput.value);
            tagsInput.value = "";
        }
    });

    if (tagFilterInput && allTagButtons.length) {
        tagFilterInput.addEventListener("input", function () {
            var query = normalize(tagFilterInput.value);
            allTagButtons.forEach(function (btn) {
                var name = normalize(btn.getAttribute("data-tag"));
                btn.style.display = !query || name.includes(query) ? "" : "none";
            });
        });
    }

    prevBtn.addEventListener("click", function () {
        saveCurrentStep();
        if (currentIndex > 0) {
            currentIndex -= 1;
            renderStep();
        }
    });

    nextBtn.addEventListener("click", function () {
        saveCurrentStep();
        if (currentIndex < filesList.length - 1) {
            currentIndex += 1;
            renderStep();
        }
    });

    finishBtn.addEventListener("click", function () {
        saveCurrentStep();
        injectHiddenFields();
        form.submit();
    });

    cancelBtn.addEventListener("click", function () {
        closeWizard();
    });
})();
