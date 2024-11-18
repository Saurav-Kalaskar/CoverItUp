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
    statusDiv.textContent = "Getting job and company information...";
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Get job description and company info
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getPageInformation
    });

    const { jobDescription, companyInfo } = results[0].result;
    
    if (!jobDescription || jobDescription === "Job description not found.") {
      throw new Error("Could not find job description on the page.");
    }

    statusDiv.textContent = "Generating cover letter...";
    
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { 
          action: "generateCoverLetter", 
          jobDescription, 
          resumeText,
          companyInfo
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

function getPageInformation() {
  // Job description selectors
  const jobSelectors = [
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

  // Company information selectors
  const companySelectors = {
    name: [
      '.company-name',
      '.organization-name',
      '[data-automation="employer"]',
      '.employer-name',
      '.company',
      '[class*="companyName"]',
      '[class*="employerName"]',
      '.jobs-company__name',
      // LinkedIn specific
      '.jobs-company__name',
      '.jobs-unified-top-card__company-name',
      // Indeed specific
      '.company-name',
      '.jobsearch-CompanyInfoContainer',
      // Glassdoor specific
      '.employer-name',
      '.company-name'
    ],
    address: [
      '.company-address',
      '.organization-address',
      '[data-automation="location"]',
      '.employer-address',
      '[class*="location"]',
      '[class*="address"]',
      '.jobs-company__location',
      // LinkedIn specific
      '.jobs-company__location',
      '.jobs-unified-top-card__location',
      // Indeed specific
      '.company-location',
      '.location',
      // Glassdoor specific
      '.location'
    ]
  };

  // Get job description
  let jobDescription = '';
  for (const selector of jobSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      jobDescription = element.innerText;
      break;
    }
  }

  // If no job description found, try alternative approach
  if (!jobDescription) {
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

    jobDescription = textBlocks[0]?.innerText || "Job description not found.";
  }

  // Get company information
  const companyInfo = {
    name: '',
    address: ''
  };

  // Try to find company name
  for (const selector of companySelectors.name) {
    const element = document.querySelector(selector);
    if (element) {
      companyInfo.name = element.innerText.trim();
      break;
    }
  }

  // Try to find company address
  for (const selector of companySelectors.address) {
    const element = document.querySelector(selector);
    if (element) {
      companyInfo.address = element.innerText.trim();
      break;
    }
  }

  return {
    jobDescription,
    companyInfo
  };
}