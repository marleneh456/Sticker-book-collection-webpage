let pages = JSON.parse(localStorage.getItem("stickerPages")) || [[]];
let zoomLevel = parseFloat(localStorage.getItem("zoomLevel")) || 1;
let currentPage = 0;
let isFlipping = false; 

const page = document.getElementById("page");
const pageNumber = document.getElementById("pageNumber");
const zoomLabel = document.getElementById("zoomLabel");
const fontPanel = document.getElementById("fontPanel");
const fontSelect = document.getElementById("fontSelect");
const effectSelect = document.getElementById("effectSelect");
const colorPicker = document.getElementById("colorPicker");
const textEditBox = document.getElementById("textEditBox");
const layerPanel = document.getElementById("layerPanel");
const leftArrow = document.getElementById("leftArrow");
const rightArrow = document.getElementById("rightArrow");

const neonColorPicker = document.getElementById("neonColorPicker");
const shadowAColorPicker = document.getElementById("shadowAColorPicker");
const shadowBColorPicker = document.getElementById("shadowBColorPicker");
const shadowCColorPicker = document.getElementById("shadowCColorPicker");
const neonColorControls = document.getElementById("neonColorControls");
const multiShadowColorControls = document.getElementById("multiShadowColorControls");

let selectedItem = null;

// NEW: This function runs once to push any "stuck" text down from the top bar area
function clearTopBarArea() {
    let changed = false;
    pages.forEach(pageArr => {
        pageArr.forEach(item => {
            if (item.y < 130) { 
                item.y = 150; // Force it down below the buttons
                changed = true;
            }
        });
    });
    if (changed) saveData();
}

function saveData() {
    localStorage.setItem("stickerPages", JSON.stringify(pages));
    localStorage.setItem("zoomLevel", zoomLevel);
}

function updateZoom() {
    page.style.transform = `scale(${zoomLevel})`;
    zoomLabel.textContent = Math.round(zoomLevel * 100) + "%";
    saveData();
}

function updateArrows() {
    leftArrow.classList.toggle("disabled", currentPage === 0);
    rightArrow.classList.toggle("disabled", currentPage === pages.length - 1);
}

zoomInBtn.onclick = () => { zoomLevel = Math.min(zoomLevel + 0.1, 3); updateZoom(); };
zoomOutBtn.onclick = () => { zoomLevel = Math.max(zoomLevel - 0.1, 0.25); updateZoom(); };

function renderPage() {
    page.innerHTML = "";
    pageNumber.textContent = "Page " + (currentPage + 1) + " / " + pages.length;

    pages[currentPage].forEach((item, index) => {
        let div = document.createElement("div");
        div.className = "item";
        div.style.position = "absolute"; 
        div.style.left = item.x + "px";
        div.style.top = item.y + "px";
        div.style.transform = `rotate(${item.rotation || 0}deg)`;

        if (item.type === "sticker") {
            div.style.width = item.size + "px";
            div.innerHTML = `
                <img src="${item.src}" style="width: 100%; height: 100%; pointer-events: none; display: block;">
                <button class="deleteBtn">x</button>
                <div class="resizeHandle"></div>
                <div class="rotateHandle"></div>
                <div class="rotateLabel">${Math.round((item.rotation || 0) % 360)}°</div>
            `;
        } else {
            div.classList.add("textItem");
            div.style.fontFamily = item.font;
            div.style.color = item.color;
            div.style.fontSize = item.size + "px";
            div.style.whiteSpace = "nowrap";

            if (item.effect === "neon") {
                div.style.textShadow = `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${item.effectColor}, 0 0 30px ${item.effectColor}`;
            } else if (item.effect === "multiShadow") {
                div.style.textShadow = `3px 3px 0px ${item.shadowA}, 6px 6px 0px ${item.shadowB}, 9px 9px 0px ${item.shadowC}`;
            }

            div.innerHTML = `${item.text}<button class="deleteBtn">x</button><div class="resizeHandle"></div><div class="rotateHandle"></div><div class="rotateLabel">${Math.round((item.rotation || 0) % 360)}°</div>`;
        }

        page.appendChild(div);
        enableDrag(div, index);
        enableResize(div, index);
        enableRotate(div, index);
        enableDelete(div, index);
        enableSelect(div, index);
    });

    if (selectedItem !== null && document.querySelectorAll(".item")[selectedItem]) {
        document.querySelectorAll(".item")[selectedItem].classList.add("selected");
    }
    updateZoom();
    updateArrows();
}

function enableSelect(div, index) {
    div.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll(".item").forEach(i => i.classList.remove("selected"));
        div.classList.add("selected");
        selectedItem = index;
        layerPanel.style.display = "block";
        let item = pages[currentPage][index];
        if (item.type === "text") {
            fontPanel.style.display = "block";
            fontSelect.value = item.font;
            effectSelect.value = item.effect || "none";
            colorPicker.value = item.color;
            textEditBox.value = item.text;
            updateEffectUI(item.effect);
        } else { fontPanel.style.display = "none"; }
    };
}

function updateEffectUI(effect) {
    neonColorControls.style.display = (effect === "neon") ? "block" : "none";
    multiShadowColorControls.style.display = (effect === "multiShadow") ? "block" : "none";
}

textEditBox.oninput = () => {
    if (selectedItem !== null && pages[currentPage][selectedItem].type === "text") {
        pages[currentPage][selectedItem].text = textEditBox.value;
        const div = document.querySelectorAll(".item")[selectedItem];
        if (div && div.childNodes[0]) div.childNodes[0].nodeValue = textEditBox.value;
    }
};
textEditBox.onchange = () => saveData();

page.onclick = () => {
    document.querySelectorAll(".item").forEach(i => i.classList.remove("selected"));
    fontPanel.style.display = "none";
    layerPanel.style.display = "none";
    selectedItem = null;
};

// UPDATED DRAG: Strictly forbids moving items into the top 130px bar area
function enableDrag(div, index) {
    const startDrag = (e) => {
        if (e.target.tagName === "BUTTON" || e.target.className.includes("Handle")) return;
        e.stopPropagation();
        div.style.zIndex = 1000; 

        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let clientY = e.touches ? e.touches[0].clientY : e.clientY;
        let pageRect = page.getBoundingClientRect();
        
        let offsetX = (clientX - pageRect.left) / zoomLevel - pages[currentPage][index].x;
        let offsetY = (clientY - pageRect.top) / zoomLevel - pages[currentPage][index].y;

        const moveDrag = (e) => {
            e.preventDefault();
            let moveX = e.touches ? e.touches[0].clientX : e.clientX;
            let moveY = e.touches ? e.touches[0].clientY : e.clientY;

            let x = (moveX - pageRect.left) / zoomLevel - offsetX;
            let y = (moveY - pageRect.top) / zoomLevel - offsetY;

            // SAFETY ZONE: Y must be at least 130 to stay away from top buttons
            if (y < 130) y = 130;

            div.style.left = x + "px";
            div.style.top = y + "px";
            pages[currentPage][index].x = x;
            pages[currentPage][index].y = y;
        };

        const endDrag = () => {
            div.style.zIndex = ""; 
            document.removeEventListener("mousemove", moveDrag);
            document.removeEventListener("touchmove", moveDrag);
            document.removeEventListener("mouseup", endDrag);
            document.removeEventListener("touchend", endDrag);
            saveData();
        };

        document.addEventListener("mousemove", moveDrag);
        document.addEventListener("touchmove", moveDrag, { passive: false });
        document.addEventListener("mouseup", endDrag);
        document.addEventListener("touchend", endDrag);
    };
    div.addEventListener("mousedown", startDrag);
    div.addEventListener("touchstart", startDrag, { passive: false });
}

function enableResize(div, index) {
    let handle = div.querySelector(".resizeHandle");
    const startResize = (e) => {
        e.stopPropagation(); e.preventDefault();
        let startX = e.touches ? e.touches[0].clientX : e.clientX;
        let startSize = pages[currentPage][index].size;
        const moveResize = (e) => {
            let currentX = e.touches ? e.touches[0].clientX : e.clientX;
            let newSize = Math.max(20, startSize + (currentX - startX) / zoomLevel);
            pages[currentPage][index].size = newSize;
            if (pages[currentPage][index].type === "sticker") div.style.width = newSize + "px";
            else div.style.fontSize = newSize + "px";
        };
        const endResize = () => {
            document.removeEventListener("mousemove", moveResize);
            document.removeEventListener("touchmove", moveResize);
            saveData();
        };
        document.addEventListener("mousemove", moveResize);
        document.addEventListener("touchmove", moveResize, { passive: false });
        document.addEventListener("mouseup", endResize, { once: true });
        document.addEventListener("touchend", endResize, { once: true });
    };
    handle.addEventListener("mousedown", startResize);
    handle.addEventListener("touchstart", startResize, { passive: false });
}

function enableRotate(div, index) {
    let handle = div.querySelector(".rotateHandle");
    let label = div.querySelector(".rotateLabel");
    const startRotate = (e) => {
        e.stopPropagation();
        const moveRotate = (e) => {
            let cx = e.touches ? e.touches[0].clientX : e.clientX;
            let cy = e.touches ? e.touches[0].clientY : e.clientY;
            let rect = div.getBoundingClientRect();
            let center_x = rect.left + rect.width / 2;
            let center_y = rect.top + rect.height / 2;
            let angle = Math.atan2(cy - center_y, cx - center_x) * 180 / Math.PI + 90;
            div.style.transform = `rotate(${angle}deg)`;
            pages[currentPage][index].rotation = angle;
            let disp = Math.round(angle % 360);
            label.innerText = (disp < 0 ? disp + 360 : disp) + "°";
        };
        const endRotate = () => {
            document.removeEventListener("mousemove", moveRotate);
            document.removeEventListener("touchmove", moveRotate);
            saveData();
        };
        document.addEventListener("mousemove", moveRotate);
        document.addEventListener("touchmove", moveRotate, { passive: false });
        document.addEventListener("mouseup", endRotate, { once: true });
        document.addEventListener("touchend", endRotate, { once: true });
    };
    handle.addEventListener("mousedown", startRotate);
    handle.addEventListener("touchstart", startRotate, { passive: false });
}

function enableDelete(div, index) {
    div.querySelector(".deleteBtn").onclick = (e) => { e.stopPropagation(); pages[currentPage].splice(index, 1); selectedItem = null; renderPage(); };
}

addTextBtn.onclick = () => {
    // SPAWN LOCATION: 250px down from the top bar
    pages[currentPage].push({ 
        type: "text", text: "New Text", font: "Arial", color: "#000000", x: 150, y: 250, size: 40, rotation: 0, 
        effect: "none", effectColor: "#ff00de", shadowA: "#ff00de", shadowB: "#00d4ff", shadowC: "#15a033"
    });
    renderPage();
};

fontSelect.onchange = () => { if(selectedItem !== null) { pages[currentPage][selectedItem].font = fontSelect.value; renderPage(); } };
effectSelect.onchange = () => { if(selectedItem !== null) { pages[currentPage][selectedItem].effect = effectSelect.value; updateEffectUI(effectSelect.value); renderPage(); } };

function updateLiveStyle() {
    if (selectedItem === null) return;
    const item = pages[currentPage][selectedItem];
    const div = document.querySelectorAll(".item")[selectedItem];
    if (!div) return;
    div.style.color = item.color;
    if (item.effect === "neon") div.style.textShadow = `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${item.effectColor}, 0 0 30px ${item.effectColor}`;
    else if (item.effect === "multiShadow") div.style.textShadow = `3px 3px 0px ${item.shadowA}, 6px 6px 0px ${item.shadowB}, 9px 9px 0px ${item.shadowC}`;
    else div.style.textShadow = "none";
}

colorPicker.oninput = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].color=colorPicker.value; updateLiveStyle(); } };
neonColorPicker.oninput = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].effectColor=neonColorPicker.value; updateLiveStyle(); } };
shadowAColorPicker.oninput = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].shadowA=shadowAColorPicker.value; updateLiveStyle(); } };
shadowBColorPicker.oninput = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].shadowB=shadowBColorPicker.value; updateLiveStyle(); } };
shadowCColorPicker.oninput = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].shadowC=shadowCColorPicker.value; updateLiveStyle(); } };

[colorPicker, neonColorPicker, shadowAColorPicker, shadowBColorPicker, shadowCColorPicker].forEach(p => p.onchange = saveData);

uploadSticker.onchange = (e) => {
    let file = e.target.files[0];
    if(!file) return;
    let reader = new FileReader();
    reader.onload = () => {
        pages[currentPage].push({ type: "sticker", src: reader.result, x: 150, y: 250, size: 150, rotation: 0 });
        renderPage();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
};

leftArrow.onclick = () => {
    if(isFlipping || currentPage <= 0) return;
    isFlipping = true; page.classList.add("flipping-prev");
    setTimeout(() => { currentPage--; renderPage(); page.classList.remove("flipping-prev"); isFlipping = false; }, 600);
};

rightArrow.onclick = () => {
    if(isFlipping || currentPage >= pages.length - 1) return;
    isFlipping = true; page.classList.add("flipping-next");
    setTimeout(() => { currentPage++; renderPage(); page.classList.remove("flipping-next"); isFlipping = false; }, 600);
};

addPageBtn.onclick = () => { pages.push([]); currentPage = pages.length - 1; renderPage(); };
deletePageBtn.onclick = () => { if(pages.length > 1) { pages.splice(currentPage, 1); currentPage = Math.max(0, currentPage - 1); renderPage(); } };

openBookBtn.onclick = () => { coverScreen.style.opacity = "0"; setTimeout(() => { coverScreen.style.display = "none"; bookContainer.style.display = "block"; clearTopBarArea(); renderPage(); }, 800); };
backBtn.onclick = () => { bookContainer.style.display = "none"; coverScreen.style.display = "flex"; setTimeout(() => { coverScreen.style.opacity = "1"; }, 50); };

clearTopBarArea();
renderPage();