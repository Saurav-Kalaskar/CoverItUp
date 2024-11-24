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

        // Extract department from job description
        const departmentMatch = jobDescription.match(/department:\s*([^\n]+)/i);
        const department = departmentMatch ? departmentMatch[1].trim() : 'Department';

        // Extract campus, with better regex pattern
        const campusMatch = jobDescription.match(/campus:\s*([^,\n]+)/i);
        const campus = campusMatch ? campusMatch[1].trim() : 'Tempe'; // Default to Tempe if not found

        console.log('Extracted campus:', campus); // Debug log

        const prompt = `
You are a professional cover letter generator. Create a compelling cover letter following this EXACT format:

[MUST START WITH THIS EXACT HEADER FORMAT:]
Saurav Sunil Kalaskar
(602) 399-6425 | skalaska@asu.edu
Tempe, AZ 85288

${currentDate}

Hiring Manager
${department}
Arizona State University, ${campus}, AZ

Dear Hiring Manager,

[FIRST PARAGRAPH GUIDELINES - Create a unique, engaging opening that:]
- Uses creative analogies (can be technical, innovative, or industry-relevant)
- Connects real-world/ ongoing technical concepts to your professional capabilities
- Shows understanding of the role's technical requirements
- Demonstrates immediate value proposition
- Can reference:
  * Technology concepts or principles
  * Industry trends or challenges
  * Educational or research impact
  * Innovation and problem-solving approaches
  * System architecture or infrastructure metaphors
  * Real-world technical scenarios
- Must flow naturally into your qualifications
- Should be unique and not formulaic
- should be broad to let the reader know that you are a good fit for the job

[REMAINING PARAGRAPHS:]
[Second Paragraph - Highlight specific achievements:]
- Focus on most relevant technical experience
- Include quantifiable results
- Connect directly to job requirements
- Use active voice and specific examples

[Third Paragraph - Demonstrate additional value:]
- Highlight complementary skills
- Show understanding of department needs
- Include relevant academic or project experience
- Demonstrate growth mindset

[Final Paragraph - Strong closing:]
- Express genuine interest in the role
- Reference specific department goals
- Include clear call to action
- Keep professional and confident

End with:
Sincerely,
Saurav Sunil Kalaskar

Style Requirements:
- MUST include all header information exactly as shown above
- Create unique, engaging openings not limited to any specific templates
- Maintain professional tone while being creative
- Use natural transitions between paragraphs
- Include technical terms appropriately
- Avoid clichés and generic phrases
- No headers or style labels in the actual letter

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