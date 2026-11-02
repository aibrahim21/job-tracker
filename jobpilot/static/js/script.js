
const form = document.getElementById("job-form");
const jobList = document.getElementById("job-list");
const recentJobList = document.getElementById("recent-job-list");

const emptyState = document.getElementById("empty-state");
const dashboardEmpty = document.getElementById("dashboard-empty");
const noResults = document.getElementById("no-results");

const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const sortOrder = document.getElementById("sort-order");

const pageTitle = document.getElementById("page-title");

const pageNames = {
    dashboard: "Dashboard",
    applications: "Applications",
    "add-application": "Add Application"
};

let jobs = JSON.parse(
    localStorage.getItem("jobPilotApps") || "[]"
);

let currentPage = "dashboard";

function today() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function daysBetween(startDate, endDate) {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");

    return Math.max(0, Math.floor((end - start) / 86400000));
}

function saveJobs() {
    localStorage.setItem("jobPilotApps", JSON.stringify(jobs));
}

function showPage(pageName) {
    // Add Application is now a view inside the Dashboard
    if (pageName === "add-application") {
        currentPage = "dashboard";

        document.querySelectorAll(".page-section").forEach(section => {
            section.hidden = section.id !== "dashboard-page";
        });

        document.getElementById("recent-applications-section").hidden = true;
        document.getElementById("dashboard-add-form").hidden = false;
        

        pageTitle.textContent = "Dashboard";

        document.querySelectorAll(".nav-link[data-page]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.page === "dashboard"
            );
        });

        return;
    }

    currentPage = pageName;

    document.querySelectorAll(".page-section").forEach(section => {
        section.hidden = section.id !== `${pageName}-page`;
    });

    // When returning to Dashboard, show Recent Applications again
    if (pageName === "dashboard") {
        document.getElementById("recent-applications-section").hidden = false;
        document.getElementById("dashboard-add-form").hidden = true;
    }

    pageTitle.textContent = pageNames[pageName] || "Job Pilot";

    document.querySelectorAll(".nav-link[data-page]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageName
        );
    });

    renderAll();
}

document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", function () {
        console.log("Button clicked:", button.dataset.page);
        showPage(button.dataset.page);
    });
});

function updateDashboard() {
    document.getElementById("total-count").textContent = jobs.length;

    document.getElementById("interview-count").textContent =
        jobs.filter(job => job.status === "Interview").length;

    document.getElementById("offer-count").textContent =
        jobs.filter(job => job.status === "Offer").length;

    document.getElementById("waiting-count").textContent =
        jobs.filter(job =>
            !job.responseDate &&
            ["Applied", "Assessment"].includes(job.status || "Applied")
        ).length;

    dashboardEmpty.hidden = jobs.length !== 0;

    recentJobList.innerHTML = "";

    const recentJobs = jobs
        .map((job, index) => ({ ...job, originalIndex: index }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3);

    recentJobs.forEach(job => {
        const card = createJobCard(job, job.originalIndex);
        recentJobList.appendChild(card);
    });
}

function createJobCard(job, index) {
    const card = document.createElement("article");
    card.className = "job-card";

    const title = document.createElement("h3");
    title.textContent = job.company;

    const position = document.createElement("p");
    position.textContent = "Position: " + job.position;

    const applied = document.createElement("p");
    applied.textContent =
        `Applied: ${job.date} (${daysBetween(job.date, today())} days ago)`;

    const statusLabel = document.createElement("label");
    statusLabel.textContent = "Application status";

    const statusSelect = document.createElement("select");

    [
        "Applied", "Assessment", "Interview",
        "Offer", "Rejected", "Withdrawn"
    ].forEach(statusName => {
        const option = document.createElement("option");
        option.value = statusName;
        option.textContent = statusName;
        statusSelect.appendChild(option);
    });

    statusSelect.value = job.status || "Applied";

    statusSelect.addEventListener("change", function() {
        jobs[index].status = statusSelect.value;
        saveJobs();
        renderAll();
    });

    statusLabel.appendChild(statusSelect);

    const response = document.createElement("p");
    response.className = "muted";

    if (job.responseDate) {
        response.textContent =
            `Last company response: ${job.responseDate} ` +
            `(${daysBetween(job.responseDate, today())} days ago)`;
    } else if (
        ["Applied", "Assessment"].includes(job.status || "Applied")
    ) {
        response.textContent =
            `No response recorded — ${daysBetween(job.date, today())} ` +
            "days since application.";
    } else {
        response.textContent = "No response date recorded.";
    }

    const responseLabel = document.createElement("label");
    responseLabel.textContent = "Last company response date";

    const responseInput = document.createElement("input");
    responseInput.type = "date";
    responseInput.max = today();
    responseInput.value = job.responseDate || "";

    responseInput.addEventListener("change", function() {
        if (responseInput.value && responseInput.value < job.date) {
            alert("Response date cannot be before the application date.");
            responseInput.value = jobs[index].responseDate || "";
            return;
        }

        jobs[index].responseDate = responseInput.value;
        saveJobs();
        renderAll();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete application";
    deleteButton.className = "delete-button";

    deleteButton.addEventListener("click", function() {
        if (confirm("Delete this application?")) {
            jobs.splice(index, 1);
            saveJobs();
            renderAll();
        }
    });

    card.append(
        title,
        position,
        applied,
        statusLabel,
        response,
        responseLabel,
        responseInput,
        deleteButton
    );

    return card;
}

function displayJobs() {
    jobList.innerHTML = "";

    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedSort = sortOrder.value;

    let filteredJobs = jobs
        .map((job, index) => ({ ...job, originalIndex: index }))
        .filter(job => {
            const company = (job.company || "").toLowerCase();
            const position = (job.position || "").toLowerCase();

            const matchesSearch =
                company.includes(query) || position.includes(query);

            const matchesStatus =
                selectedStatus === "All" ||
                (job.status || "Applied") === selectedStatus;

            return matchesSearch && matchesStatus;
        });

    filteredJobs.sort((a, b) => {
        if (selectedSort === "newest") {
            return (b.date || "").localeCompare(a.date || "");
        }

        if (selectedSort === "oldest") {
            return (a.date || "").localeCompare(b.date || "");
        }

        if (selectedSort === "waiting") {
            return daysBetween(b.date, today()) -
                   daysBetween(a.date, today());
        }

        if (selectedSort === "company") {
            return (a.company || "").localeCompare(b.company || "");
        }

        return 0;
    });

    emptyState.hidden = jobs.length !== 0;
    noResults.hidden = jobs.length === 0 || filteredJobs.length !== 0;

    document.getElementById("results-count").textContent =
        `Showing ${filteredJobs.length} of ${jobs.length} applications`;

    filteredJobs.forEach(job => {
        jobList.appendChild(createJobCard(job, job.originalIndex));
    });
}

function renderAll() {
    updateDashboard();

    if (currentPage === "applications") {
        displayJobs();
    }
}

form.addEventListener("submit", function(event) {
    event.preventDefault();

    const company = document.getElementById("company").value.trim();
    const position = document.getElementById("position").value.trim();
    const applicationDate = document.getElementById("application-date").value;
    const applicationStatus = document.getElementById("application-status").value;

    if (!company || !position) {
        alert("Please enter the company name and job title.");
        return;
    }

    const newJob = {
        id: crypto.randomUUID(),
        company,
        position,
        date: applicationDate || today(),
        status: applicationStatus || "Applied",
        responseDate: "",
        cvVersion: "",
        coverLetterVersion: "",
        cvFileName: "",
        cvFileData: "",
        cvLink: "",
        cvText: "",
        coverLetterFileName: "",
        coverLetterFileData: "",
        coverLetterLink: "",
        coverLetterText: "",
        notes: ""
    };

    jobs.push(newJob);

    saveJobs();
    form.reset();

    showPage("dashboard");
});

searchInput.addEventListener("input", displayJobs);
statusFilter.addEventListener("change", displayJobs);
sortOrder.addEventListener("change", displayJobs);

showPage("dashboard");
