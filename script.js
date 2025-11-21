import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey:"AIzaSyDOnCWCmkuASQyBDU645ydrIXutj4_wfq8",
    authDomain:"to-do-ecd2b.firebaseapp.com",
    projectId:"to-do-ecd2b",
    storageBucket:"to-do-ecd2b.firebasestorage.app",
    messagingSenderId:"688781168822",
    appId:"1:688781168822:web:baf48fa0de30433cfb5617",
    measurementId:"G-9XZBGPP5D0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let taskToDelete = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    document.getElementById("userInfo").innerText = "Logged as: "+user.email;

    const content = document.getElementById("taskList");
    const snap = await getDocs(collection(db,"users",user.uid,"tasks"));
    content.innerHTML = "";

    snap.forEach(docSnap => {
        const d = docSnap.data();
        const div = document.createElement("div");
        div.className = "task";

        const header = document.createElement("div");
        header.className = "task-header";

        const left = document.createElement("div");
        left.style.display = "flex";
        left.style.alignItems = "center";
        left.style.gap = "8px";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = d.done;
        checkbox.dataset.docId = docSnap.id;

        const nameSpan = document.createElement("span");
        nameSpan.className = "task-name";
        nameSpan.innerText = d.name;

        left.appendChild(checkbox);
        left.appendChild(nameSpan);

        const right = document.createElement("div");
        right.className = "task-buttons";

        const del = document.createElement("img");
        del.src = "trash.svg";
        del.className = "delete-btn";
        del.dataset.docId = docSnap.id;

        const small = document.createElement("small");
        small.innerText = d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : "";

        const star = document.createElement("span");
        star.innerText = d.important ? "⭐" : "";

        right.appendChild(small);
        right.appendChild(star);
        right.appendChild(del);

        header.appendChild(left);
        header.appendChild(right);

        const desc = document.createElement("div");
        desc.className = "task-desc";
        desc.innerText = d.description || "No se ha proporcionado una descripción";

        div.appendChild(header);
        div.appendChild(desc);
        content.appendChild(div);

        div.onclick = (e)=>{
            if(e.target!==checkbox && e.target!==del){
                if(desc.style.maxHeight===""||desc.style.maxHeight==="0px"){
                    desc.style.maxHeight="200px";
                    desc.style.paddingTop="8px";
                }else{
                    desc.style.maxHeight="0px";
                    desc.style.paddingTop="0px";
                }
            }
        };

        del.onclick = () => {
            taskToDelete = del.dataset.docId;
            document.getElementById("confirmModal").classList.add("show");
        };
    });

    document.getElementById("modalAdd").onclick = async ()=>{
        const name = document.getElementById("taskInput").value;
        const description = document.getElementById("taskDesc").value;
        const important = document.getElementById("importantSwitch").checked;
        if(name.trim().length===0) return;
        await addDoc(collection(db,"users",user.uid,"tasks"), {name, description, important, done:false, createdAt: serverTimestamp()});
        location.reload();
    };

    document.getElementById("modalConfirm").onclick = async ()=>{
        const tasks = document.querySelectorAll(".task-header input[type=checkbox]:checked");
        for(const cb of tasks){
            await updateDoc(doc(db,"users",user.uid,"tasks",cb.dataset.docId), {done:true});
        }
        location.reload();
    };

    const confirmYes = document.getElementById("confirmYes");
    const confirmNo = document.getElementById("confirmNo");

    confirmYes.onclick = async ()=>{
        if(taskToDelete){
            await deleteDoc(doc(db,"users",user.uid,"tasks",taskToDelete));
            location.reload();
        }
    };

    confirmNo.onclick = ()=>{
        document.getElementById("confirmModal").classList.remove("show");
        taskToDelete = null;
    };

    document.getElementById("logoutBtn").onclick = async ()=>{
        await signOut(auth);
        window.location.href = "index.html";
    };

    document.getElementById("loadingScreen").style.opacity = 0;
    setTimeout(()=>{document.getElementById("loadingScreen").style.display="none"},300);
});

function refreshDate(){
    const f = new Date();
    const d=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const m=["January","February","March","April","May","June","July","August","September","October","November","December"];
    document.getElementById("date").innerText=`${d[f.getDay()]}, ${m[f.getMonth()]} ${f.getDate()}`;
}
refreshDate();

const modal=document.getElementById("modal");
document.getElementById("addTask").onclick=()=>modal.classList.add("show");
modal.onclick=e=>{if(e.target===modal) modal.classList.remove("show");};
document.getElementById('logoutBtnMobile').addEventListener('click', () => {
    document.getElementById('logoutBtn').click();
});