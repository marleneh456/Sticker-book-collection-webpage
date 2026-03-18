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
const coverScreen = document.getElementById("coverScreen");
const bookContainer = document.getElementById("bookContainer");

const neonColorPicker = document.getElementById("neonColorPicker");
const shadowAColorPicker = document.getElementById("shadowAColorPicker");
const shadowBColorPicker = document.getElementById("shadowBColorPicker");
const shadowCColorPicker = document.getElementById("shadowCColorPicker");
const neonColorControls = document.getElementById("neonColorControls");
const multiShadowColorControls = document.getElementById("multiShadowColorControls");

let selectedItem = null;

function clearTopBarArea() {
    let changed = false;
    pages.forEach(p => p.forEach(item => { if (item.y < 130) { item.y = 150; changed = true; } }));
    if (changed) saveData();
}

function saveData() {
    localStorage.setItem("stickerPages", JSON.stringify(pages));
    localStorage.setItem("zoomLevel", zoomLevel);
}

function updateZoom() {
    page.style.transform = `scale(${zoomLevel})`;
    zoomLabel.textContent = Math.round(zoomLevel * 100) + "%";
}

function updateArrows() {
    leftArrow.classList.toggle("disabled", currentPage === 0);
    rightArrow.classList.toggle("disabled", currentPage === pages.length - 1);
}

function renderPage() {
    page.innerHTML = "";
    pageNumber.textContent = `Page ${currentPage + 1} / ${pages.length}`;

    pages[currentPage].forEach((item, index) => {
        let div = document.createElement("div");
        div.className = "item";
        div.style.left = item.x + "px";
        div.style.top = item.y + "px";
        div.style.transform = `rotate(${item.rotation || 0}deg)`;

        if (item.type === "sticker") {
            div.style.width = item.size + "px";
            div.innerHTML = `<img src="${item.src}" style="width:100%;height:100%;pointer-events:none;"><button class="deleteBtn">x</button><div class="resizeHandle"></div><div class="rotateHandle"></div><div class="rotateLabel">${Math.round(item.rotation || 0)}°</div>`;
        } else {
            div.classList.add("textItem");
            div.style.fontFamily = item.font;
            div.style.fontSize = item.size + "px";
            div.style.color = item.color;
            applyEffectStyles(div, item);
            div.innerHTML = `${item.text}<button class="deleteBtn">x</button><div class="resizeHandle"></div><div class="rotateHandle"></div><div class="rotateLabel">${Math.round(item.rotation || 0)}°</div>`;
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

function applyEffectStyles(div, item) {
    div.style.textShadow = "none";
    div.style.webkitTextStroke = "0px transparent";
    if (item.effect === "neon") {
        div.style.textShadow = `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${item.effectColor}, 0 0 30px ${item.effectColor}`;
    } else if (item.effect === "multiShadow") {
        div.style.textShadow = `3px 3px 0px ${item.shadowA}, 6px 6px 0px ${item.shadowB}, 9px 9px 0px ${item.shadowC}`;
    } else if (item.effect === "fire") {
        div.style.textShadow = `0 0 20px #fefcc9, 10px -10px 30px #feec85, -20px -20px 40px #ffae42, 0 -40px 100px #ec3e00`;
    } else if (item.effect === "outline") {
        div.style.webkitTextStroke = "2px black";
    } else if (item.effect === "emboss") {
        div.style.textShadow = `2px 2px 2px rgba(255,255,255,0.5), -2px -2px 2px rgba(0,0,0,0.5)`;
    }
}

function fastUpdateStyle() {
    if (selectedItem === null) return;
    const item = pages[currentPage][selectedItem];
    const div = document.querySelectorAll(".item")[selectedItem];
    if (div && item.type === "text") {
        div.style.color = item.color;
        applyEffectStyles(div, item);
    }
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
            updateEffectUI(item.effect);
            fontSelect.value = item.font;
            effectSelect.value = item.effect || "none";
            colorPicker.value = item.color;
            textEditBox.value = item.text;
        } else { fontPanel.style.display = "none"; }
    };
}

function updateEffectUI(effect) {
    neonColorControls.style.display = (effect === "neon") ? "block" : "none";
    multiShadowColorControls.style.display = (effect === "multiShadow") ? "block" : "none";
}

colorPicker.oninput = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].color=colorPicker.value; fastUpdateStyle(); }};
neonColorPicker.oninput = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].effectColor=neonColorPicker.value; fastUpdateStyle(); }};
shadowAColorPicker.oninput = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].shadowA=shadowAColorPicker.value; fastUpdateStyle(); }};
shadowBColorPicker.oninput = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].shadowB=shadowBColorPicker.value; fastUpdateStyle(); }};
shadowCColorPicker.oninput = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].shadowC=shadowCColorPicker.value; fastUpdateStyle(); }};

[colorPicker, neonColorPicker, shadowAColorPicker, shadowBColorPicker, shadowCColorPicker].forEach(p => p.onchange = saveData);

textEditBox.oninput = () => {
    if (selectedItem !== null && pages[currentPage][selectedItem].type === "text") {
        pages[currentPage][selectedItem].text = textEditBox.value;
        const div = document.querySelectorAll(".item")[selectedItem];
        if (div && div.childNodes[0]) div.childNodes[0].nodeValue = textEditBox.value;
    }
};
textEditBox.onchange = () => saveData();

// Smooth Transitions for Navigation
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

openBookBtn.onclick = () => { 
    coverScreen.style.opacity = "0"; 
    setTimeout(() => { 
        coverScreen.style.display = "none"; 
        bookContainer.style.display = "block"; 
        clearTopBarArea(); 
        renderPage(); 
    }, 800); 
};

backBtn.onclick = () => { 
    bookContainer.style.display = "none"; 
    coverScreen.style.display = "flex"; 
    setTimeout(() => { coverScreen.style.opacity = "1"; }, 50); 
};

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

        const moveDrag = (me) => {
            let x = (me.clientX - pageRect.left) / zoomLevel - offsetX;
            let y = (me.clientY - pageRect.top) / zoomLevel - offsetY;
            if (y < 130) y = 130; 
            div.style.left = x + "px"; div.style.top = y + "px";
            pages[currentPage][index].x = x; pages[currentPage][index].y = y;
        };
        const endDrag = () => { div.style.zIndex = ""; document.removeEventListener("mousemove", moveDrag); saveData(); };
        document.addEventListener("mousemove", moveDrag);
        document.addEventListener("mouseup", endDrag, {once:true});
    };
    div.addEventListener("mousedown", startDrag);
}

function enableResize(div, index) {
    let handle = div.querySelector(".resizeHandle");
    handle.onmousedown = (e) => {
        e.stopPropagation(); e.preventDefault();
        let startX = e.clientX; let startSize = pages[currentPage][index].size;
        const moveResize = (me) => {
            let ns = Math.max(20, startSize + (me.clientX - startX) / zoomLevel);
            pages[currentPage][index].size = ns;
            if (pages[currentPage][index].type === "sticker") div.style.width = ns + "px";
            else div.style.fontSize = ns + "px";
        };
        const endResize = () => { document.removeEventListener("mousemove", moveResize); saveData(); };
        document.addEventListener("mousemove", moveResize);
        document.addEventListener("mouseup", endResize, {once:true});
    };
}

function enableRotate(div, index) {
    let handle = div.querySelector(".rotateHandle");
    handle.onmousedown = (e) => {
        e.stopPropagation();
        const moveRotate = (me) => {
            let rect = div.getBoundingClientRect();
            let angle = Math.atan2(me.clientY - (rect.top + rect.height / 2), me.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI + 90;
            div.style.transform = `rotate(${angle}deg)`;
            pages[currentPage][index].rotation = angle;
            div.querySelector(".rotateLabel").innerText = Math.round(angle % 360) + "°";
        };
        const endRotate = () => { document.removeEventListener("mousemove", moveRotate); saveData(); };
        document.addEventListener("mousemove", moveRotate);
        document.addEventListener("mouseup", endRotate, {once:true});
    };
}

function enableDelete(div, index) {
    div.querySelector(".deleteBtn").onclick = (e) => { e.stopPropagation(); pages[currentPage].splice(index, 1); selectedItem = null; renderPage(); };
}

addTextBtn.onclick = () => {
    pages[currentPage].push({ type: "text", text: "New Text", font: "Arial", color: "#000000", x: 150, y: 250, size: 40, rotation: 0, effect: "none", effectColor: "#ff00de", shadowA: "#ff00de", shadowB: "#00d4ff", shadowC: "#15a033" });
    renderPage();
};

fontSelect.onchange = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].font=fontSelect.value; renderPage(); }};
effectSelect.onchange = () => { if(selectedItem!==null){ pages[currentPage][selectedItem].effect=effectSelect.value; updateEffectUI(effectSelect.value); renderPage(); }};

uploadSticker.onchange = (e) => {
    let reader = new FileReader();
    reader.onload = () => { pages[currentPage].push({ type: "sticker", src: reader.result, x: 150, y: 250, size: 150, rotation: 0 }); renderPage(); };
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
};

addPageBtn.onclick = () => { pages.push([]); currentPage = pages.length - 1; renderPage(); };
deletePageBtn.onclick = () => { if(pages.length > 1) { pages.splice(currentPage, 1); currentPage = Math.max(0, currentPage - 1); renderPage(); }};

page.onclick = () => { document.querySelectorAll(".item").forEach(i => i.classList.remove("selected")); fontPanel.style.display = "none"; layerPanel.style.display = "none"; selectedItem = null; };

clearTopBarArea();
renderPage();