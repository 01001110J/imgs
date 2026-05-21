(function () {
    var fileInput = document.getElementById("id_image_file");
    var dropZone = document.getElementById("drop-zone");
    var pickFile = document.getElementById("pick-file");

    if (dropZone && fileInput) {
        if (pickFile) {
            pickFile.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                fileInput.click();
            });
        }

        function attachFile(file) {
            if (typeof DataTransfer === "undefined") return;
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
    var STORAGE_TAGS_KEY = "gallery_tag_catalog_v1";
    var STORAGE_OVERFLOW_KEY = "gallery_bulk_overflow_v1";
    var MAX_FILES = 200;

    function normalize(value) { return (value || "").trim().toLowerCase(); }

    function readInitialTags() {
        var script = document.getElementById("all-tags-json");
        if (!script) return [];
        try { return JSON.parse(script.textContent || "[]"); } catch (_) { return []; }
    }

    function loadTagCatalog() {
        var base = readInitialTags().map(normalize).filter(Boolean);
        try {
            var stored = JSON.parse(localStorage.getItem(STORAGE_TAGS_KEY) || "[]");
            stored.forEach(function (tag) {
                var v = normalize(tag);
                if (v && base.indexOf(v) === -1) base.push(v);
            });
        } catch (_) {}
        return base;
    }

    function persistTagCatalog(catalog) {
        try { localStorage.setItem(STORAGE_TAGS_KEY, JSON.stringify(catalog)); } catch (_) {}
    }

    function persistOverflow(files) {
        try {
            localStorage.setItem(STORAGE_OVERFLOW_KEY, JSON.stringify(files.map(function (f) {
                return { name: f.name, size: f.size, type: f.type, lastModified: f.lastModified };
            })));
        } catch (_) {}
    }

    var form = document.getElementById("bulk-upload-form");
    var bulkInput = document.getElementById("bulk-images-input");
    var bulkDrop = document.getElementById("bulk-drop-zone");
    var bulkPick = document.getElementById("bulk-pick-file");
    var hiddenFields = document.getElementById("bulk-hidden-fields");
    var overflowNote = document.getElementById("bulk-overflow-note");

    if (!form || !bulkInput || !bulkDrop || !hiddenFields) return;

    var modal = document.getElementById("bulk-modal");
    var preview = document.getElementById("bulk-current-preview");
    var stepLabel = document.getElementById("bulk-step-label");
    var descriptionInput = document.getElementById("bulk-description-input");
    var prevBtn = document.getElementById("bulk-prev-btn");
    var nextBtn = document.getElementById("bulk-next-btn");
    var finishBtn = document.getElementById("bulk-finish-btn");
    var cancelBtn = document.getElementById("bulk-cancel-btn");
    var removeBtn = document.getElementById("bulk-remove-btn");

    var tagEditor = document.getElementById("bulk-tag-editor");
    var tagsInput = tagEditor ? tagEditor.querySelector(".js-bulk-tags-input") : null;
    var chipsWrap = tagEditor ? tagEditor.querySelector(".js-bulk-tag-chips") : null;
    var suggestionsBox = tagEditor ? tagEditor.querySelector(".js-bulk-tags-suggestions-box") : null;

    var isWizardPage = !!(modal && preview && stepLabel && descriptionInput && prevBtn && nextBtn && finishBtn && cancelBtn && removeBtn && tagEditor && tagsInput && chipsWrap && suggestionsBox);

    var filesList = [];
    var meta = [];
    var currentIndex = 0;
    var tagCatalog = loadTagCatalog();

    function updateInputFiles() {
        if (typeof DataTransfer === "undefined") return;
        var dt = new DataTransfer();
        filesList.forEach(function (f) { dt.items.add(f); });
        bulkInput.files = dt.files;
    }

    function ensureMetaSize() {
        while (meta.length < filesList.length) meta.push({ description: "", tags: [] });
        if (meta.length > filesList.length) meta = meta.slice(0, filesList.length);
    }

    function saveCurrent() {
        if (!isWizardPage || !filesList.length) return;
        var item = meta[currentIndex];
        item.description = (descriptionInput.value || "").trim();
        if ((tagsInput.value || "").trim()) {
            addTag(tagsInput.value);
            tagsInput.value = "";
        }
    }

    function renderChips() {
        if (!isWizardPage) return;
        var item = meta[currentIndex];
        chipsWrap.innerHTML = "";
        item.tags.forEach(function (tag) {
            var chip = document.createElement("span");
            chip.className = "tag-chip";
            chip.textContent = tag;

            var remove = document.createElement("button");
            remove.type = "button";
            remove.className = "tag-chip-remove";
            remove.textContent = "x";
            remove.addEventListener("click", function () {
                item.tags = item.tags.filter(function (t) { return t !== tag; });
                renderChips();
                renderSuggestions();
            });

            chip.appendChild(remove);
            chipsWrap.appendChild(chip);
        });
    }

    function addTag(raw) {
        var tag = normalize(raw);
        if (!tag || !isWizardPage) return;
        var item = meta[currentIndex];
        if (item.tags.indexOf(tag) === -1) item.tags.push(tag);
        if (tagCatalog.indexOf(tag) === -1) {
            tagCatalog.push(tag);
            persistTagCatalog(tagCatalog);
        }
        renderChips();
        renderSuggestions();
    }

    function renderSuggestions() {
        if (!isWizardPage) return;
        var query = normalize(tagsInput.value);
        var item = meta[currentIndex] || { tags: [] };
        var available = tagCatalog.filter(function (t) { return item.tags.indexOf(t) === -1; });
        var matches = available.filter(function (t) { return !query || t.indexOf(query) !== -1; }).slice(0, 12);

        suggestionsBox.innerHTML = "";
        matches.forEach(function (tag) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "tag-suggestion-btn js-bulk-add-tag";
            btn.setAttribute("data-tag", tag);
            btn.textContent = tag;
            suggestionsBox.appendChild(btn);
        });

        if (query && available.indexOf(query) === -1 && item.tags.indexOf(query) === -1) {
            var create = document.createElement("button");
            create.type = "button";
            create.className = "tag-suggestion-btn js-bulk-add-tag";
            create.setAttribute("data-tag", query);
            create.textContent = 'Create "' + query + '"';
            suggestionsBox.appendChild(create);
        }
    }

    function renderStep() {
        if (!isWizardPage || !filesList.length) return;
        ensureMetaSize();
        var item = meta[currentIndex];
        preview.src = URL.createObjectURL(filesList[currentIndex]);
        descriptionInput.value = item.description || "";
        tagsInput.value = "";
        renderChips();
        renderSuggestions();

        stepLabel.textContent = (currentIndex + 1) + " / " + filesList.length;
        prevBtn.disabled = currentIndex === 0;
        nextBtn.style.display = currentIndex < filesList.length - 1 ? "inline-block" : "none";
        finishBtn.style.display = currentIndex === filesList.length - 1 ? "inline-block" : "none";
    }

    function openWizard() {
        if (!isWizardPage || !filesList.length) return;
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        currentIndex = 0;
        renderStep();
    }

    function closeWizard() {
        if (!isWizardPage) return;
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
    }

    function prepareFiles(fileList) {
        var incoming = Array.from(fileList || []);
        if (!incoming.length) return;

        var accepted = incoming.slice(0, MAX_FILES);
        var overflow = incoming.slice(MAX_FILES);

        if (overflow.length) {
            persistOverflow(overflow);
            if (overflowNote) {
                overflowNote.textContent = "Only first 200 files loaded. Extra files were saved as temporary metadata in your browser.";
            }
        } else if (overflowNote) {
            overflowNote.textContent = "";
        }

        filesList = accepted;
        ensureMetaSize();
        updateInputFiles();
        openWizard();
    }

    function removeCurrent() {
        if (!filesList.length) return;
        filesList.splice(currentIndex, 1);
        meta.splice(currentIndex, 1);
        if (currentIndex >= filesList.length) currentIndex = Math.max(0, filesList.length - 1);
        updateInputFiles();
        if (!filesList.length) {
            closeWizard();
            return;
        }
        renderStep();
    }

    function buildHiddenFields() {
        hiddenFields.innerHTML = "";
        meta.forEach(function (item) {
            var d = document.createElement("input");
            d.type = "hidden";
            d.name = "descriptions[]";
            d.value = item.description || "";
            hiddenFields.appendChild(d);

            var t = document.createElement("input");
            t.type = "hidden";
            t.name = "tags[]";
            t.value = (item.tags || []).join(", ");
            hiddenFields.appendChild(t);
        });
    }

    if (bulkPick) {
        bulkPick.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            bulkInput.click();
        });
    }

    bulkDrop.addEventListener("click", function (event) {
        if (event.target && event.target.id === "bulk-pick-file") return;
        bulkInput.click();
    });

    bulkInput.addEventListener("change", function () {
        if (bulkInput.files && bulkInput.files.length) prepareFiles(bulkInput.files);
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
        if (event.dataTransfer.files && event.dataTransfer.files.length) {
            prepareFiles(event.dataTransfer.files);
        }
    });

    if (isWizardPage) {
        tagEditor.addEventListener("click", function (event) {
            var btn = event.target.closest(".js-bulk-add-tag");
            if (!btn) return;
            addTag(btn.getAttribute("data-tag"));
            tagsInput.value = "";
            renderSuggestions();
            tagsInput.focus();
        });

        tagsInput.addEventListener("input", renderSuggestions);
        tagsInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag(tagsInput.value);
                tagsInput.value = "";
                renderSuggestions();
            } else if (event.key === "Backspace" && !tagsInput.value) {
                var item = meta[currentIndex];
                if (item && item.tags.length) {
                    item.tags.pop();
                    renderChips();
                    renderSuggestions();
                }
            }
        });

        tagsInput.addEventListener("blur", function () {
            if ((tagsInput.value || "").trim()) {
                addTag(tagsInput.value);
                tagsInput.value = "";
                renderSuggestions();
            }
        });

        prevBtn.addEventListener("click", function () {
            saveCurrent();
            if (currentIndex > 0) {
                currentIndex -= 1;
                renderStep();
            }
        });

        nextBtn.addEventListener("click", function () {
            saveCurrent();
            if (currentIndex < filesList.length - 1) {
                currentIndex += 1;
                renderStep();
            }
        });

        finishBtn.addEventListener("click", function () {
            saveCurrent();
            buildHiddenFields();
            form.submit();
        });

        removeBtn.addEventListener("click", function () {
            removeCurrent();
        });

        cancelBtn.addEventListener("click", function () {
            closeWizard();
        });
    }
})();
