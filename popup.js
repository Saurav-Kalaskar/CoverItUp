// Debug logging
console.log('Popup script loaded');

// Store DOM elements
const elements = {
    generate: document.getElementById("generate"),
    status: document.getElementById("status"),
    resumeText: document.getElementById("resumeText"),
    apiKey: document.getElementById("apiKey"),
    apiKeyStatus: document.getElementById("apiKeyStatus"),
    saveApiKey: document.getElementById("saveApiKey"),
    output: document.getElementById("output")
};

// API Key handling
elements.saveApiKey.addEventListener('click', async () => {
    const apiKey = elements.apiKey.value.trim();
    
    if (!apiKey) {
        showStatus('apiKeyStatus', 'Please enter an API key', 'error');
        return;
    }

    try {
        await chrome.storage.sync.set({ 'geminiApiKey': apiKey });
        showStatus('apiKeyStatus', 'API key saved!', 'success');
        setTimeout(() => {
            elements.apiKeyStatus.textContent = '';
        }, 2000);
    } catch (error) {
        showStatus('apiKeyStatus', 'Error saving API key', 'error');
        console.error('Save API key error:', error);
    }
});

// Generate button handler
elements.generate.addEventListener("click", async () => {
    console.log('Generate button clicked');
    
    try {
        // Validate inputs
        const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
        if (!geminiApiKey) {
            throw new Error("Please enter your Gemini API key in the settings above.");
        }
        
        const resumeText = elements.resumeText.value.trim();
        if (!resumeText) {
            throw new Error("Please paste your resume text first.");
        }

        showStatus('status', "Getting job description...");
        
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            throw new Error("No active tab found");
        }

        // Execute content script
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: getJobDescription
        });

        if (!results || !results[0]) {
            throw new Error("Failed to execute content script");
        }

        const jobDescription = results[0].result;
        
        if (!jobDescription || jobDescription === "Job description not found.") {
            throw new Error("Could not find job description. Please make sure you're on a job posting page.");
        }

        showStatus('status', "Found job description. Generating cover letter...");
        
        // Generate cover letter
        const response = await chrome.runtime.sendMessage({
            action: "generateCoverLetter",
            jobDescription,
            resumeText,
            apiKey: geminiApiKey
        });

        if (response.error) {
            throw new Error(response.error);
        }

        // Handle success
        showStatus('status', "Cover letter generated successfully!");
        downloadCoverLetter(response.coverLetter);
        elements.output.textContent = response.coverLetter;

    } catch (error) {
        console.error('Generation error:', error);
        showStatus('status', error.message || "An error occurred", 'error');
    }
});

// Helper functions
function showStatus(elementId, message, type = '') {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = type ? `status-text ${type}` : 'status-text';
}

function downloadCoverLetter(content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Saurav_Kalaskar_Cover_Letter.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Load saved API key on popup open
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded');
    try {
        const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
        if (geminiApiKey) {
            elements.apiKey.value = geminiApiKey;
        }
    } catch (error) {
        console.error('Error loading API key:', error);
    }
});

// Job description extraction function
function getJobDescription() {
    try {
        const mainJobDetails = document.querySelector('.jobDetailsLiner.mainDetails');
        if (!mainJobDetails) {
            console.log('Main job details not found');
            return "Job description not found.";
        }

        const sections = {
            jobTitle: mainJobDetails.querySelector('.jobtitleInJobDetails')?.textContent?.trim() || '',
            jobDescription: mainJobDetails.querySelector('.jobdescriptionInJobDetails')?.textContent?.trim() || '',
            essentialDuties: Array.from(mainJobDetails.querySelectorAll('.questionClass .question'))
                .find(el => el.textContent.includes('Essential Duties'))
                ?.nextElementSibling?.textContent?.trim() || '',
            minQualifications: Array.from(mainJobDetails.querySelectorAll('.questionClass .question'))
                .find(el => el.textContent.includes('Minimum Qualifications'))
                ?.nextElementSibling?.textContent?.trim() || '',
            desiredQualifications: Array.from(mainJobDetails.querySelectorAll('.questionClass .question'))
                .find(el => el.textContent.includes('Desired Qualifications'))
                ?.nextElementSibling?.textContent?.trim() || ''
        };

        console.log('Extracted sections:', sections);

        return Object.entries(sections)
            .filter(([_, value]) => value)
            .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').trim()}: ${value}`)
            .join('\n\n');

    } catch (error) {
        console.error('Error extracting job description:', error);
        return "Error extracting job description. Please try again.";
    }
}