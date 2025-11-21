import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

let allTasks = [];
let taskToDelete = null;
let currentTab = "My Day";

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    document.getElementById("userInfo").innerText = "Logged as: "+user.email;
    await loadAllTasks(user);
    activateTab("My Day");
    renderTasksFromCache("My Day");
    document.getElementById("loadingScreen").style.opacity = 0;
    setTimeout(()=>{document.getElementById("loadingScreen").style.display="none"},300);
});

async function loadAllTasks(user){
    allTasks = [];
    const snap = await getDocs(collection(db,"users",user.uid,"tasks"));
    snap.forEach(docSnap=>{
        allTasks.push({
            id: docSnap.id,
            ...docSnap.data()
        });
    });
}

function renderTasksFromCache(tab){
    const content = document.getElementById("taskList");
    content.innerHTML = "";
    const today = new Date();

    allTasks.forEach(d=>{
        if (tab==="Important" && !d.important) return;
        if (tab==="My Day") {
            let assigned = d.assignedDate ? d.assignedDate.toDate() : today;
            if (assigned.toDateString() !== today.toDateString()) return;
        }

        const div = document.createElement("div");
        div.className = "task";

        const header = document.createElement("div");
        header.className = "task-header";

        const left = document.createElement("div");
        left.style.display="flex";
        left.style.alignItems="center";
        left.style.gap="8px";

        const checkbox = document.createElement("input");
        checkbox.type="checkbox";
        checkbox.checked=d.done;
        checkbox.dataset.docId=d.id;

        const nameSpan = document.createElement("span");
        nameSpan.className="task-name";
        nameSpan.innerText=d.name;

        left.appendChild(checkbox);
        left.appendChild(nameSpan);

        const right = document.createElement("div");
        right.className="task-buttons";

        const del = document.createElement("img");
        del.src="trash.svg";
        del.className="delete-btn";
        del.dataset.docId=d.id;

        const small = document.createElement("small");
        let dispDate = d.assignedDate ? d.assignedDate.toDate() : today;
        small.innerText=dispDate.toLocaleDateString();

        const star = document.createElement("span");
        star.innerText=d.important ? "⭐" : "";

        right.appendChild(small);
        right.appendChild(star);
        right.appendChild(del);

        header.appendChild(left);
        header.appendChild(right);

        const desc = document.createElement("div");
        desc.className="task-desc";
        desc.innerText=d.description || "";

        div.appendChild(header);
        div.appendChild(desc);
        content.appendChild(div);

        div.onclick=e=>{
            if(e.target!==checkbox && e.target!==del){
                if(desc.style.maxHeight==="200px"){
                    desc.style.maxHeight="0px";
                    desc.style.paddingTop="0px";
                } else {
                    desc.style.maxHeight="200px";
                    desc.style.paddingTop="8px";
                }
            }
        };

        del.onclick=()=>{
            taskToDelete=d.id;
            document.getElementById("confirmModal").classList.add("show");
        };

        checkbox.onchange=async()=>{
            await updateDoc(doc(db,"users",auth.currentUser.uid,"tasks",checkbox.dataset.docId), {
                done: checkbox.checked
            });
        };
    });
}

function activateTab(tab){
    currentTab = tab;
    document.querySelector(".header-title").innerText = tab;
    renderTasksFromCache(tab);
}

document.querySelectorAll(".menu-option").forEach(op=>{
    op.onclick=()=>{
        activateTab(op.innerText);
    };
});

document.getElementById("myDayBtn").onclick=()=>activateTab("My Day");
document.getElementById("importantBtn").onclick=()=>activateTab("Important");
document.getElementById("tasksBtn").onclick=()=>activateTab("Tasks");

document.getElementById("modalAdd").onclick = async ()=>{
    const name = document.getElementById("taskInput").value;
    const description = document.getElementById("taskDesc").value;
    const important = document.getElementById("importantSwitch").checked;
    const dateInput = document.getElementById("taskdate").value;

    if(name.trim().length===0) return;

    let assignedDate;
    if(dateInput.trim()===""){
        assignedDate = Timestamp.fromDate(new Date());
    } else {
        assignedDate = Timestamp.fromDate(new Date(dateInput));
    }

    await addDoc(collection(db,"users",auth.currentUser.uid,"tasks"), {
        name,
        description,
        important,
        done:false,
        createdAt: serverTimestamp(),
        assignedDate
    });

    await loadAllTasks(auth.currentUser);
    renderTasksFromCache(currentTab);
    document.getElementById("modal").classList.remove("show");
};

document.getElementById("modalConfirm").onclick = async ()=>{
    const tasks = document.querySelectorAll(".task-header input[type=checkbox]:checked");
    for(const cb of tasks){
        await updateDoc(doc(db,"users",auth.currentUser.uid,"tasks",cb.dataset.docId), {done:true});
    }
    await loadAllTasks(auth.currentUser);
    renderTasksFromCache(currentTab);
};

document.getElementById("confirmYes").onclick = async ()=>{
    if(taskToDelete){
        await deleteDoc(doc(db,"users",auth.currentUser.uid,"tasks",taskToDelete));
        await loadAllTasks(auth.currentUser);
        renderTasksFromCache(currentTab);
    }
    document.getElementById("confirmModal").classList.remove("show");
};

document.getElementById("confirmNo").onclick=()=>{
    document.getElementById("confirmModal").classList.remove("show");
    taskToDelete=null;
};

document.getElementById("logoutBtn").onclick = async ()=>{
    await signOut(auth);
    window.location.href="index.html";
};

document.getElementById('logoutBtnMobile').addEventListener('click',()=>{
    document.getElementById('logoutBtn').click();
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
