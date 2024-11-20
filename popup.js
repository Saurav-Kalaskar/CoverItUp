document.getElementById("generate").addEventListener("click", async () => {
  const statusDiv = document.getElementById("status");
  const resumeText = document.getElementById("resumeText").value;
  const generateButton = document.getElementById("generate");
  
  if (!resumeText.trim()) {
    statusDiv.textContent = "Please paste your resume text first.";
    return;
  }

  try {
    generateButton.disabled = true;
    statusDiv.textContent = "Getting job description...";
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getJobDescription
    });

    const jobDescription = results[0].result;
    
    if (!jobDescription || jobDescription === "Job description not found.") {
      throw new Error("Could not find job description on the page.");
    }

    statusDiv.textContent = "Generating cover letter...";
    
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { 
          action: "generateCoverLetter", 
          jobDescription, 
          resumeText 
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve(response);
          }
        }
      );
    });

    if (response.error) {
      throw new Error(response.error);
    }

    if (response.coverLetter) {
      // Create blob from text content
      const blob = new Blob([response.coverLetter], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];
      const filename = `Saurav_Kalaskar_Cover_Letter_${date}.txt`;

      await new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: url,
          filename: filename,
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(new Error("Failed to download file"));
          } else {
            resolve(downloadId);
          }
        });
      });

      URL.revokeObjectURL(url);
      statusDiv.textContent = "Cover letter downloaded successfully!";
    }

  } catch (error) {
    console.error("Error:", error);
    statusDiv.textContent = `Error: ${error.message}`;
  } finally {
    generateButton.disabled = false;
  }
});

function getJobDescription() {
  const selectors = [
    '.job-description',
    '[data-automation="jobDescription"]',
    '.description__text',
    '#job-details',
    '.job-details',
    '.job-posting-content',
    '[class*="description"]',
    '[class*="jobDescription"]',
    '.jobs-description',
    '.jobs-box__html-content',
    '#jobDescriptionText',
    '.job-overview',
    '.job_description',
    '.position-description',
    '.vacancy-description'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.innerText;
    }
  }

  const textBlocks = Array.from(document.getElementsByTagName('*'))
    .filter(el => {
      const text = el.innerText;
      return text && 
             text.length > 200 && 
             (text.toLowerCase().includes('requirements') || 
              text.toLowerCase().includes('responsibilities') ||
              text.toLowerCase().includes('qualifications'));
    })
    .sort((a, b) => b.innerText.length - a.innerText.length);

  return textBlocks[0]?.innerText || "Job description not found.";
}