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
    output: document.getElementById("output"),
    downloadButton: document.getElementById("downloadButton")
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

        // Extract job title from the description
        const jobTitleMatch = jobDescription.match(/job title:\s*([^\n]+)/i);
        const jobTitle = jobTitleMatch ? jobTitleMatch[1].trim() : 'Position';
        
        // Store job title in the output div's data attribute
        elements.output.dataset.jobTitle = jobTitle;

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
        elements.output.textContent = response.coverLetter;
        elements.downloadButton.style.display = 'block';
        saveState();

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
    
    if (type === 'error') {
        elements.downloadButton.style.display = 'none';
    }
}

function downloadCoverLetter(content, jobTitle) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Clean up job title by removing special characters and spaces
    const cleanJobTitle = jobTitle.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    const fileName = `Cover_Letter_${cleanJobTitle}_${timestamp}.txt`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
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

        // Find department name element
        const departmentQuestion = Array.from(mainJobDetails.querySelectorAll('.questionClass .question'))
            .find(el => el.textContent.includes('Department Name'));
        const departmentName = departmentQuestion?.nextElementSibling?.textContent?.trim() || 'Department Not Found';

        // Find campus location - look for text that starts with "Campus:"
        const campusElements = Array.from(mainJobDetails.querySelectorAll('.section2RightfieldsInJobDetails'));
        const campusText = campusElements.find(el => el.textContent.includes('Campus:'))?.textContent || '';
        const campusLocation = campusText.replace('Campus:', '').trim();

        const sections = {
            jobTitle: mainJobDetails.querySelector('.jobtitleInJobDetails')?.textContent?.trim() || '',
            department: departmentName,
            campus: campusLocation,  // This will now be "Polytechnic" without "Campus:" prefix
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
        console.log('Campus Location:', campusLocation); // Debug log

        return Object.entries(sections)
            .filter(([_, value]) => value)
            .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').trim()}: ${value}`)
            .join('\n\n');

    } catch (error) {
        console.error('Error extracting job description:', error);
        return "Error extracting job description. Please try again.";
    }
}

// Add new event listener for download button
elements.downloadButton.addEventListener('click', () => {
    const coverLetter = elements.output.textContent;
    const jobTitle = elements.output.dataset.jobTitle || 'Position';
    if (coverLetter) {
        downloadCoverLetter(coverLetter, jobTitle);
    }
});

// Add save state function
function saveState() {
    const state = {
        resumeText: elements.resumeText.value,
        outputText: elements.output.textContent,
        showDownloadButton: elements.downloadButton.style.display,
        jobTitle: elements.output.dataset.jobTitle || ''
    };
    
    chrome.storage.local.set({ extensionState: state }, () => {
        console.log('State saved');
    });
}

// Add restore state function
async function restoreState() {
    try {
        const { extensionState } = await chrome.storage.local.get('extensionState');
        if (extensionState) {
            elements.resumeText.value = extensionState.resumeText || '';
            elements.output.textContent = extensionState.outputText || '';
            elements.downloadButton.style.display = extensionState.showDownloadButton || 'none';
            if (extensionState.jobTitle) {
                elements.output.dataset.jobTitle = extensionState.jobTitle;
            }
        }
    } catch (error) {
        console.error('Error restoring state:', error);
    }
}

// Add event listeners for state management
document.addEventListener('DOMContentLoaded', restoreState);

// Save state when text changes
elements.resumeText.addEventListener('input', saveState);

// Save state when output changes (add this after generating cover letter)
const observer = new MutationObserver(saveState);
observer.observe(elements.output, { 
    characterData: true, 
    childList: true, 
    subtree: true 
});

// Save state before popup closes
window.addEventListener('beforeunload', saveState);