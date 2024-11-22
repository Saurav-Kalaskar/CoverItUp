console.log('Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    
    if (request.action === "generateCoverLetter") {
        (async () => {
            try {
                const coverLetter = await generateCoverLetter(
                    request.jobDescription,
                    request.resumeText,
                    request.apiKey
                );
                sendResponse({ coverLetter });
            } catch (error) {
                console.error('Generation error:', error);
                sendResponse({ error: error.message });
            }
        })();
        return true; // Keep message channel open
    }
});

async function generateCoverLetter(jobDescription, resumeText, apiKey) {
    try {
        const currentDate = new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        const prompt = `
You are a professional cover letter generator. Write a customized cover letter that must follow this exact format AND the writing instructions below:

Saurav Sunil Kalaskar
(602) 399-6425 | skalaska@asu.edu
${currentDate}

Hiring Manager
Department
Arizona State University, Tempe, AZ

Dear Hiring Manager,

Writing Instructions for the body paragraphs:
1. Introduction:
   - Begin with an engaging and creative opening sentence to capture the recruiter's interest
   - Use a humorous or technical tone based on the job context
   - Briefly mention how the candidate's background aligns with job requirements

2. Body (Two paragraphs):
   - In each paragraph, highlight two main keywords (skills, experiences, or achievements) most relevant to the job
   - Explain how these skills/experiences demonstrate ability to excel in the role
   - Use specific examples from the resume
   - Keep language professional yet approachable

3. Conclusion:
   - End with enthusiasm for the role and company
   - Include a polite call-to-action for interview

Sincerely,
Saurav Sunil Kalaskar

Use this job description to identify relevant skills and requirements: ${jobDescription}
And match with experience from this resume: ${resumeText}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API request failed: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Invalid response format from API');
        }

        return data.candidates[0].content.parts[0].text;

    } catch (error) {
        console.error('Error in generateCoverLetter:', error);
        throw error;
    }
}