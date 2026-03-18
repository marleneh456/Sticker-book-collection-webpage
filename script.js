// --- 1. IndexedDB System ---
let db;
const request = indexedDB.open("StickerBookDB", 30); // Incremented version for a fresh start

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("bookData")) {
        db.createObjectStore("bookData");
    }
};

request.onsuccess = (e) => {
    db = e.target.result;
    loadData(); 
};

// --- 2. App State ---
let pages = [[]];
let zoomLevel = 1.0;
let currentPage = 0;
let isFlipping = false;
let selectedItem = null;
let saveTimeout = null;

// --- 3. DOM Elements ---
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
const coverScreen = document.getElementById("coverScreen");
const bookContainer = document.getElementById("bookContainer");

const neonColorPicker = document.getElementById("neonColorPicker");
const shadowAColorPicker = document.getElementById("shadowAColorPicker");
const shadowBColorPicker = document.getElementById("shadowBColorPicker");
const shadowCColorPicker = document.getElementById("shadowCColorPicker");
const neonColorControls = document.getElementById("neonColorControls");
const multiShadowColorControls = document.getElementById("multiShadowColorControls");

// --- 4. Database Functions ---
function saveData() {
    if (!db) return;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const tx = db.transaction("bookData", "readwrite");
        const store = tx.objectStore("bookData");
        store.put(JSON.parse(JSON.stringify(pages)), "pages");
        store.put(zoomLevel, "zoomLevel");
        store.put(currentPage, "currentPage");
    }, 200);
}

function loadData() {
    if (!db) return;
    const tx = db.transaction("bookData", "readonly");
    const store = tx.objectStore("bookData");
    
    store.get("pages").onsuccess = (e) => {
        if (e.target.result && e.target.result.length > 0) pages = e.target.result;
        store.get("currentPage").onsuccess = (ev) => {
            if (ev.target.result !== undefined) currentPage = ev.target.result;
            store.get("zoomLevel").onsuccess = (evZ) => {
                if (evZ.target.result) zoomLevel = evZ.target.result;
                renderPage();
            };
        };
    };
}

// --- 5. Core Rendering ---
function renderPage() {
    page.innerHTML = "";
    if (!pages[currentPage]) pages[currentPage] = [];
    pageNumber.textContent = `Page ${currentPage + 1} / ${pages.length}`;

    pages[currentPage].forEach((item, index) => {
        let div = document.createElement("div");
        div.className = "item";
        div.style.left = item.x + "px";
        div.style.top = item.y + "px";
        div.style.transform = `rotate(${item.rotation || 0}deg)`;
        div.style.touchAction = "none"; 

        let displayRot = Math.round((item.rotation || 0) % 360);
        if (displayRot < 0) displayRot += 360;

        if (item.type === "sticker") {
            div.style.width = item.size + "px";
            div.innerHTML = `<img src="${item.src}" style="width:100%;height:100%;pointer-events:none;">
                             <button class="deleteBtn">x</button>
                             <div class="resizeHandle"></div>
                             <div class="rotateHandle"></div>
                             <div class="rotateLabel">${displayRot}°</div>`;
        } else {
            div.classList.add("textItem");
            div.style.fontFamily = item.font;
            div.style.fontSize = item.size + "px";
            div.style.color = item.color;
            applyEffectStyles(div, item);
            div.innerHTML = `<span class="textContent">${item.text}</span>
                             <button class="deleteBtn">x</button>
                             <div class="resizeHandle"></div>
                             <div class="rotateHandle"></div>
                             <div class="rotateLabel">${displayRot}°</div>`;
        }

        page.appendChild(div);
        enableDrag(div, index);
        enableResize(div, index);
        enableRotate(div, index);
        enableDelete(div, index);
    });

    if (selectedItem !== null && document.querySelectorAll(".item")[selectedItem]) {
        document.querySelectorAll(".item")[selectedItem].classList.add("selected");
    }
    updateZoom();
    updateArrows();
}

// --- 6. Effects Logic (The Fix) ---
function applyEffectStyles(div, item) {
    div.style.textShadow = "none";
    div.style.webkitTextStroke = "0px transparent";
    
    // Use saved colors or default to bright colors if they don't exist yet
    const nCol = item.effectColor || "#ff00de";
    const sA = item.shadowA || "#ff00de";
    const sB = item.shadowB || "#00d4ff";
    const sC = item.shadowC || "#15a033";

    if (item.effect === "neon") {
        div.style.textShadow = `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${nCol}, 0 0 30px ${nCol}`;
    } else if (item.effect === "multiShadow") {
        div.style.textShadow = `3px 3px 0px ${sA}, 6px 6px 0px ${sB}, 9px 9px 0px ${sC}`;
    } else if (item.effect === "fire") {
        div.style.textShadow = `0 0 20px #fefcc9, 10px -10px 30px #feec85, -20px -20px 40px #ffae42, 0 -40px 100px #ec3e00`;
    } else if (item.effect === "outline") {
        div.style.webkitTextStroke = "2px black";
    } else if (item.effect === "emboss") {
        div.style.textShadow = `2px 2px 2px rgba(255,255,255,0.5), -2px -2px 2px rgba(0,0,0,0.5)`;
    }
}

// Update the specific data in the array so it saves correctly
function updateItemData(key, value) {
    if (selectedItem !== null) {
        pages[currentPage][selectedItem][key] = value;
        const div = document.querySelectorAll(".item")[selectedItem];
        if (div) {
            if (key === 'color') div.style.color = value;
            applyEffectStyles(div, pages[currentPage][selectedItem]);
        }
        saveData();
    }
}

// --- 7. Event Listeners for Pickers ---
colorPicker.oninput = (e) => updateItemData('color', e.target.value);
neonColorPicker.oninput = (e) => updateItemData('effectColor', e.target.value);
shadowAColorPicker.oninput = (e) => updateItemData('shadowA', e.target.value);
shadowBColorPicker.oninput = (e) => updateItemData('shadowB', e.target.value);
shadowCColorPicker.oninput = (e) => updateItemData('shadowC', e.target.value);

textEditBox.oninput = () => {
    if (selectedItem !== null) {
        const val = textEditBox.value;
        pages[currentPage][selectedItem].text = val;
        const div = document.querySelectorAll(".item")[selectedItem];
        if (div) div.querySelector('.textContent').innerText = val;
        saveData();
    }
};

// --- 8. Selection & Interactions ---
function selectItem(index, div) {
    document.querySelectorAll(".item").forEach(i => i.classList.remove("selected"));
    div.classList.add("selected");
    selectedItem = index;
    layerPanel.style.display = "block";
    
    let item = pages[currentPage][index];
    if (item.type === "text") {
        fontPanel.style.display = "block";
        updateEffectUI(item.effect);
        fontSelect.value = item.font;
        effectSelect.value = item.effect || "none";
        colorPicker.value = item.color;
        textEditBox.value = item.text;
        // Sync effect pickers to saved values
        neonColorPicker.value = item.effectColor || "#ff00de";
        shadowAColorPicker.value = item.shadowA || "#ff00de";
        shadowBColorPicker.value = item.shadowB || "#00d4ff";
        shadowCColorPicker.value = item.shadowC || "#15a033";
    } else { fontPanel.style.display = "none"; }
}

function enableDrag(div, index) {
    div.addEventListener("pointerdown", (e) => {
        if (e.target.tagName === "BUTTON" || e.target.className.includes("Handle")) return;
        e.stopPropagation();
        selectItem(index, div); 
        div.style.zIndex = 1000;
        let pageRect = page.getBoundingClientRect();
        let offsetX = (e.clientX - pageRect.left) / zoomLevel - pages[currentPage][index].x;
        let offsetY = (e.clientY - pageRect.top) / zoomLevel - pages[currentPage][index].y;
        div.setPointerCapture(e.pointerId);

        const moveDrag = (me) => {
            let x = (me.clientX - pageRect.left) / zoomLevel - offsetX;
            let y = (me.clientY - pageRect.top) / zoomLevel - offsetY;
            div.style.left = x + "px"; div.style.top = y + "px";
            pages[currentPage][index].x = x; pages[currentPage][index].y = y;
        };
        const endDrag = (me) => { 
            div.style.zIndex = ""; div.releasePointerCapture(me.pointerId);
            div.removeEventListener("pointermove", moveDrag);
            saveData(); 
        };
        div.addEventListener("pointermove", moveDrag);
        div.addEventListener("pointerup", endDrag, {once:true});
    });
}

function enableResize(div, index) {
    let handle = div.querySelector(".resizeHandle");
    handle.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        let startX = e.clientX; 
        let startSize = pages[currentPage][index].size;
        handle.setPointerCapture(e.pointerId);
        const moveResize = (me) => {
            let ns = Math.max(20, startSize + (me.clientX - startX) / zoomLevel);
            pages[currentPage][index].size = ns;
            if (pages[currentPage][index].type === "sticker") div.style.width = ns + "px";
            else div.style.fontSize = ns + "px";
        };
        const endResize = (me) => { 
            handle.releasePointerCapture(me.pointerId);
            handle.removeEventListener("pointermove", moveResize);
            saveData(); 
        };
        handle.addEventListener("pointermove", moveResize);
        handle.addEventListener("pointerup", endResize, {once:true});
    });
}

function enableRotate(div, index) {
    let handle = div.querySelector(".rotateHandle");
    handle.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        handle.setPointerCapture(e.pointerId);
        const moveRotate = (me) => {
            let rect = div.getBoundingClientRect();
            let angle = Math.atan2(me.clientY - (rect.top + rect.height / 2), me.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI + 90;
            div.style.transform = `rotate(${angle}deg)`;
            pages[currentPage][index].rotation = angle;
            let displayRot = Math.round(angle % 360);
            if (displayRot < 0) displayRot += 360;
            div.querySelector(".rotateLabel").innerText = displayRot + "°";
        };
        const endRotate = (me) => { 
            handle.releasePointerCapture(me.pointerId);
            handle.removeEventListener("pointermove", moveRotate);
            saveData(); 
        };
        handle.addEventListener("pointermove", moveRotate);
        handle.addEventListener("pointerup", endRotate, {once:true});
    });
}

function enableDelete(div, index) {
    div.querySelector(".deleteBtn").onclick = (e) => { 
        e.stopPropagation(); pages[currentPage].splice(index, 1); 
        selectedItem = null; renderPage(); saveData();
    };
}

// --- 9. Toolbar Helpers ---
function updateZoom() {
    page.style.transform = `scale(${zoomLevel})`;
    zoomLabel.textContent = Math.round(zoomLevel * 100) + "%";
}
function updateArrows() {
    leftArrow.classList.toggle("disabled", currentPage === 0);
    rightArrow.classList.toggle("disabled", currentPage >= pages.length - 1);
}
function updateEffectUI(effect) {
    neonColorControls.style.display = (effect === "neon") ? "block" : "none";
    multiShadowColorControls.style.display = (effect === "multiShadow") ? "block" : "none";
}

// --- 10. Navigation & Buttons ---
fontSelect.onchange = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].font=fontSelect.value; renderPage(); saveData(); }};
effectSelect.onchange = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].effect=effectSelect.value; updateEffectUI(effectSelect.value); renderPage(); saveData(); }};

addTextBtn.onclick = () => {
    pages[currentPage].push({ type: "text", text: "New Text", font: "Arial", color: "#000000", x: 150, y: 250, size: 40, rotation: 0, effect: "none", effectColor: "#ff00de", shadowA: "#ff00de", shadowB: "#00d4ff", shadowC: "#15a033" });
    renderPage(); saveData();
};

uploadSticker.onchange = (e) => {
    let reader = new FileReader();
    reader.onload = () => { 
        pages[currentPage].push({ type: "sticker", src: reader.result, x: 150, y: 250, size: 150, rotation: 0 }); 
        renderPage(); saveData();
    };
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
};

leftArrow.onclick = () => {
    if(isFlipping || currentPage <= 0) return;
    isFlipping = true; page.classList.add("flipping-prev");
    setTimeout(() => { currentPage--; renderPage(); page.classList.remove("flipping-prev"); isFlipping = false; saveData(); }, 600);
};

rightArrow.onclick = () => {
    if(isFlipping || currentPage >= pages.length - 1) return;
    isFlipping = true; page.classList.add("flipping-next");
    setTimeout(() => { currentPage++; renderPage(); page.classList.remove("flipping-next"); isFlipping = false; saveData(); }, 600);
};

addPageBtn.onclick = () => { pages.push([]); currentPage = pages.length - 1; renderPage(); saveData(); };
deletePageBtn.onclick = () => { if(pages.length > 1) { pages.splice(currentPage, 1); currentPage = Math.max(0, currentPage - 1); renderPage(); saveData(); }};

openBookBtn.onclick = () => { 
    coverScreen.style.opacity = "0"; 
    setTimeout(() => { coverScreen.style.display = "none"; bookContainer.style.display = "block"; renderPage(); }, 800); 
};

backBtn.onclick = () => { 
    bookContainer.style.display = "none"; coverScreen.style.display = "flex"; 
    setTimeout(() => { coverScreen.style.opacity = "1"; }, 50); 
};

page.onpointerdown = (e) => {
    if (e.target === page) {
        document.querySelectorAll(".item").forEach(i => i.classList.remove("selected"));
        fontPanel.style.display = "none"; layerPanel.style.display = "none"; selectedItem = null;
    }
};