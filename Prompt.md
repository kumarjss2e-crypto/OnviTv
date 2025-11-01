1. The "Guardrail" Prompt
Copy
Only make the exact changes I request—do not modify, remove, or alter any other code, styling, or page elements unless explicitly instructed. If my request conflicts with existing code or functionality, pause and ask for confirmation before proceeding. Always follow this rule.

2. The "Overview First" Prompt
Copy
Before you generate any code, explain exactly what you plan to do. Include affected files, components, and edge cases. Wait for my confirmation before proceeding.

(This prompt alone has saved thousands of devs from hours of fixing hallucinated code.)

3. The Feature Builder
Copy
You are my AI pair programmer. I want to build [FEATURE]. Break this into steps and outline a build plan. Label each step clearly and tell me when you're ready to begin. Wait for my go-ahead.

(Great for structuring complex features like auth flows, dashboards, or CRUD operations.)

4. The "Mini Design System" Prompt
Copy
Generate a reusable UI kit using [ShadCN / Tailwind / Custom CSS]. Include button styles, typography, input fields, and spacing tokens. Keep it consistent, clean, and minimal.

(Use this early on to make your app look good fast — without Figma.)

5. The Test Coverage Prompt
Copy
Generate a complete test suite for this function/module. Include edge cases, invalid inputs, and expected outputs. Label each test and include comments explaining the logic.

(Trust but verify. This will surface edge cases the model (or you) might've missed.)

6. The Performance Debugger
Copy
Profile this code for bottlenecks. Suggest two optimizations labeled 'Option A' and 'Option B' with trade-offs. Focus on real-world scenarios, not micro-optimizations.

(Super useful when things "work" but feel slow or janky.)

7. The Real-World README Generator
Copy
Write a complete README for this project, including installation, usage, commands, and deployment steps. Assume the reader is a solo indie dev. Add emoji callouts if helpful.

(Yes, you'll actually use this README. And so will others.)

8. The AI Style Guide Prompt
Copy
From now on, follow these coding conventions: [list your rules]. Stick to them in every file unless told otherwise. Ask if anything is unclear.

(Great if you have a team — or want the AI to stop bouncing between 4 styles of JS.)

9. The Static Site Starter
Copy
Generate a clean, responsive HTML + CSS starter with no dependencies. Include a homepage, about page, and contact form. Design should be minimalist, centered layout, mobile-first.