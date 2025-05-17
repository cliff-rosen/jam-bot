import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from './ui/dialog';
import { Button } from './ui/button';
import { HelpCircle, X } from 'lucide-react';

interface Subsection {
    id: string;
    title: string;
    content: React.ReactNode;
}

interface Section {
    id: string;
    title: string;
    content?: React.ReactNode;
    subsections?: Subsection[];
}

const sections: Section[] = [
    {
        id: 'overview',
        title: 'Overview',
        content: (
            <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">What is FractalBot?</h4>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                        FractalBot is a new kind of AI assistant that combines the flexibility of natural language interaction with the rigor of structured workflows. Unlike traditional tools, it:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Architects Before Executing:</strong> Unlike regular chatbots that jump straight to answers, FractalBot first designs a structured workflow to achieve your goal</li>
                        <li><strong>Recursively Refines:</strong> Unlike static workflow tools, FractalBot dynamically creates and executes steps as needed, adapting to the task's requirements</li>
                        <li><strong>Maintains Context:</strong> While executing workflows, FractalBot preserves the big picture, ensuring each step contributes to the overall mission</li>
                        <li><strong>Verifies Progress:</strong> At each stage, FractalBot checks success criteria, ensuring the work meets quality standards before proceeding</li>
                    </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">How is it Different?</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Compared to Chatbots:</h5>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                                <li>Doesn't just answer questions - creates structured solutions</li>
                                <li>Maintains clear success criteria and verification</li>
                                <li>Organizes work into stages with clear dependencies</li>
                                <li>Manages data flow and asset tracking</li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Compared to Workflow Tools:</h5>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                                <li>Designs workflows dynamically based on the task</li>
                                <li>Creates steps recursively during execution</li>
                                <li>Uses natural language for interaction</li>
                                <li>Adapts to changing requirements</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Key Benefits</h4>
                    <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Structured Yet Flexible:</strong> Combines the rigor of workflows with the adaptability of AI</li>
                        <li><strong>Clear Progress Tracking:</strong> Each stage and step has defined success criteria</li>
                        <li><strong>Data Management:</strong> Systematic handling of inputs, outputs, and intermediate results</li>
                        <li><strong>Quality Assurance:</strong> Built-in verification at multiple levels</li>
                        <li><strong>Natural Interaction:</strong> Conversational interface while maintaining structure</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: 'core-concepts',
        title: 'Core Concepts',
        subsections: [
            {
                id: 'workflow-basics',
                title: '1. Workflow Basics',
                content: (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                            All work in FractalBot follows a simple, powerful pattern:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                            <li><strong>Define Outputs:</strong> Start by clearly specifying what you want to achieve
                                <ul className="list-disc pl-6 mt-2">
                                    <li>What are the final deliverables?</li>
                                    <li>What form should they take?</li>
                                    <li>How will you know they're complete?</li>
                                </ul>
                            </li>
                            <li><strong>Define Inputs:</strong> Identify what you have to work with
                                <ul className="list-disc pl-6 mt-2">
                                    <li>What data or resources do you have?</li>
                                    <li>What constraints or requirements exist?</li>
                                    <li>What additional information might be needed?</li>
                                </ul>
                            </li>
                            <li><strong>Connect Inputs to Outputs:</strong> Use available tools to bridge the gap
                                <ul className="list-disc pl-6 mt-2">
                                    <li>What tools can transform your inputs?</li>
                                    <li>What intermediate steps are needed?</li>
                                    <li>How do the tools chain together?</li>
                                </ul>
                            </li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 mt-4">
                            This pattern scales from simple tasks to complex missions:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                            <li><strong>Simple Tasks:</strong> A single step using one tool</li>
                            <li><strong>Complex Tasks:</strong> Multiple steps with different tools</li>
                            <li><strong>Missions:</strong> Multilevel workflows steps organized into stages</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-300 mt-4">
                            FractalBot provides a structured way to implement this pattern through its schema, which you'll learn about in the next section. This schema helps organize and track the work as it progresses from inputs to outputs.
                        </p>
                    </div>
                )
            },
            {
                id: 'schema',
                title: '2. Schema',
                content: (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                            The FractalBot schema provides the structure for implementing a robust workflow system comprised of several interrelated components:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                            <li><strong>Mission:</strong> The top-level container that defines the overall goal
                                <ul className="list-disc pl-6 mt-2">
                                    <li><strong>Goal:</strong> The fundamental reason for the mission - what you ultimately want to achieve</li>
                                    <li><strong>Outputs:</strong> The specific deliverables you believe will achieve the goal - what you need to produce</li>
                                    <li><strong>Success Criteria:</strong> The measurable conditions that verify the outputs actually achieve the goal - how you'll know you succeeded</li>
                                    <li><strong>Inputs:</strong> Required data objects to start the mission</li>
                                    <li><strong>Workflows:</strong> Structured plans to produce the outputs from the inputs</li>
                                </ul>
                                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mt-4 ml-6">
                                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                                        <strong>How These Elements Work Together:</strong> The relationship between goal, outputs, and success criteria forms a critical chain of responsibility that ensures outputs truly achieve the goal:
                                    </p>
                                    <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                                        <li><strong>Success Criteria Define Success:</strong> They must be carefully crafted to truly represent what's needed to achieve the goal</li>
                                        <li><strong>Outputs Must Meet Criteria:</strong> The outputs must demonstrably satisfy all success criteria</li>
                                        <li><strong>Goal Achievement Follows:</strong> If the success criteria truly define success, and the outputs meet all criteria, then the goal must be achieved</li>
                                    </ul>
                                    <p className="text-gray-700 dark:text-gray-300 mt-4">
                                        For example, if your goal is to "improve customer satisfaction", your success criteria might include "reduce average response time to under 2 hours" and "achieve 90% positive feedback on support interactions". These criteria must be carefully chosen to truly represent improved satisfaction. Your outputs (like a new support process and training materials) must demonstrably achieve these criteria before being released from the workflow. Only then can you be confident that the goal has been achieved.
                                    </p>
                                    <p className="text-gray-700 dark:text-gray-300 mt-4">
                                        <strong>The Workflow's Role:</strong> The workflow's job is to ensure that a sequence of steps can be identified and executed that follow the data flow rule: inputs can be transformed into outputs through a series of steps, where each step's inputs can come from any previous step's outputs or the mission's initial inputs. This ensures that the mission's inputs can be systematically transformed into the required outputs that meet the success criteria.
                                    </p>
                                </div>
                            </li>
                            <li><strong>Workflow:</strong> A collection of stages that achieve a specific part of the mission
                                <ul className="list-disc pl-6 mt-2">
                                    <li>Stages: Major phases of execution</li>
                                    <li>Assets: Data objects used throughout</li>
                                </ul>
                            </li>
                            <li><strong>Stage:</strong> A major phase with defined boundaries
                                <ul className="list-disc pl-6 mt-2">
                                    <li>Inputs: Required data from previous stages</li>
                                    <li>Outputs: Data produced for next stages</li>
                                    <li>Success Criteria: Conditions for stage completion</li>
                                    <li>Steps: Individual tasks within the stage</li>
                                </ul>
                            </li>
                            <li><strong>Step:</strong> An individual task with specific operations
                                <ul className="list-disc pl-6 mt-2">
                                    <li>Tool: Specialized function assigned during execution</li>
                                    <li>Inputs: Required data for the tool</li>
                                    <li>Outputs: Data produced by the tool</li>
                                </ul>
                            </li>
                            <li><strong>Tool:</strong> A specialized function for processing data
                                <ul className="list-disc pl-6 mt-2">
                                    <li>Input Schema: Defines required input structure</li>
                                    <li>Output Schema: Defines produced output structure</li>
                                    <li>Configuration: Settings for tool operation</li>
                                </ul>
                            </li>
                            <li><strong>Asset:</strong> A piece of information that flows through the workflow
                                <p className="text-gray-700 dark:text-gray-300 mt-2 pl-6">
                                    Assets are the fundamental units of data that flow through the workflow. Each tool operation consumes some assets as inputs and produces new assets as outputs. The workflow's job is to ensure that all required assets are available when needed, and that the final assets meet the success criteria.
                                </p>
                                <ul className="list-disc pl-6 mt-2">
                                    <li><strong>Types of Assets:</strong>
                                        <ul className="list-disc pl-6 mt-2">
                                            <li><strong>Pure Input Assets:</strong> Supplied by the user to start the workflow</li>
                                            <li><strong>Pure Output Assets:</strong> Final deliverables of the workflow</li>
                                            <li><strong>Work in Progress Assets:</strong> Intermediate results created by one step and used by another</li>
                                        </ul>
                                    </li>
                                    <li><strong>Status:</strong> Tracks the state of the asset (pending, ready, archived)</li>
                                    <li><strong>Versioning:</strong> Maintains history of changes as the asset evolves</li>
                                </ul>
                            </li>
                            <li><strong>Resource:</strong> An external system that the workflow may need to access
                                <ul className="list-disc pl-6 mt-2">
                                    <li><strong>Access via Tools:</strong> Resources are accessed through tools assigned to steps</li>
                                    <li><strong>Types of Resources:</strong>
                                        <ul className="list-disc pl-6 mt-2">
                                            <li><strong>External Services:</strong> APIs, databases, or other systems</li>
                                            <li><strong>System Access:</strong> Required permissions or connections</li>
                                            <li><strong>Processing Capabilities:</strong> Computational resources or specialized hardware</li>
                                        </ul>
                                    </li>
                                </ul>
                                <p className="text-gray-700 dark:text-gray-300 mt-2 pl-6">
                                    Resources are not data objects themselves, but rather systems that can be used to process or generate data. For example, a database is a resource that can be accessed via a database query tool to retrieve or store assets.
                                </p>
                            </li>
                        </ul>
                    </div>
                )
            },
            {
                id: 'realtime-evolution',
                title: '3. Real-time Schema Evolution',
                content: (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                            The mission lifecycle evolves in real-time through several key phases:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                            <li><strong>Mission Definition:</strong> Establishing the chain of responsibility
                                <ul className="list-disc pl-6 mt-2">
                                    <li>Defines the goal and what success looks like</li>
                                    <li>Identifies required inputs and expected outputs</li>
                                    <li>Sets clear success criteria that truly represent goal achievement</li>
                                    <li>Ensures the foundation for quality throughout the workflow</li>
                                </ul>
                                <p className="text-gray-700 dark:text-gray-300 mt-2 pl-6">
                                    This phase is critical because it establishes the chain of responsibility that will guide the entire mission. The mission definition process:
                                </p>
                                <ul className="list-disc pl-6 mt-2 text-gray-700 dark:text-gray-300">
                                    <li><strong>Distinguishes Inputs from Resources:</strong>
                                        <ul className="list-disc pl-6 mt-2">
                                            <li>Inputs are specific data objects the user must provide</li>
                                            <li>Resources are general capabilities accessed via tools</li>
                                            <li>Example: For email analysis, the emails are inputs, while email system access is a resource</li>
                                        </ul>
                                    </li>
                                    <li><strong>Evaluates Mission Feasibility:</strong>
                                        <ul className="list-disc pl-6 mt-2">
                                            <li>Checks if outputs can be produced from given inputs</li>
                                            <li>Verifies resource availability and accessibility</li>
                                            <li>Identifies any technical or practical limitations</li>
                                        </ul>
                                    </li>
                                    <li><strong>Ensures Clarity and Completeness:</strong>
                                        <ul className="list-disc pl-6 mt-2">
                                            <li>Makes goals specific and unambiguous</li>
                                            <li>Ensures success criteria are measurable</li>
                                            <li>Clarifies all assumptions and requirements</li>
                                        </ul>
                                    </li>
                                    <li><strong>Manages Scope and Focus:</strong>
                                        <ul className="list-disc pl-6 mt-2">
                                            <li>Keeps mission scope appropriately bounded</li>
                                            <li>Identifies and removes unnecessary complexities</li>
                                            <li>Clarifies what's included and what's not</li>
                                            <li>Considers breaking down complex missions</li>
                                        </ul>
                                    </li>
                                    <li><strong>Verifies Information Sufficiency:</strong>
                                        <ul className="list-disc pl-6 mt-2">
                                            <li>Ensures all necessary information is available</li>
                                            <li>Identifies any missing details needed to proceed</li>
                                            <li>Validates that inputs are realistically obtainable</li>
                                            <li>Confirms outputs will be useful for the goal</li>
                                        </ul>
                                    </li>
                                </ul>
                                <p className="text-gray-700 dark:text-gray-300 mt-2 pl-6">
                                    This comprehensive evaluation process ensures that the mission is well-defined, feasible, and focused before proceeding to workflow architecture. If any issues are identified, the mission elements are adjusted, limitations are clearly explained, and complex missions may be broken down into simpler ones. This prevents the "garbage in, garbage out" principle and sets up the workflow for success.
                                </p>
                            </li>
                            <li><strong>Workflow Architecture:</strong> Balancing exploration and focus
                                <ul className="list-disc pl-6 mt-2">
                                    <li>Defines major stages that remain relatively fixed</li>
                                    <li>Establishes clear boundaries for each stage</li>
                                    <li>Identifies stage-level inputs, outputs, and success criteria</li>
                                    <li>Creates a framework for systematic exploration</li>
                                </ul>
                                <p className="text-gray-700 dark:text-gray-300 mt-2 pl-6">
                                    The architecture phase finds the balance between exploring the full solution space and maintaining focus. By establishing clear stage boundaries and success criteria, it prevents the workflow from going down unproductive rabbit holes while still allowing for thorough exploration of valid solutions.
                                </p>
                            </li>
                            <li><strong>Stage Execution:</strong> Dynamic creation and execution of steps
                                <ul className="list-disc pl-6 mt-2">
                                    <li>Steps are created recursively as needed</li>
                                    <li>Tools are assigned to steps during execution</li>
                                    <li>Assets are created and modified by tool operations</li>
                                    <li>Success criteria are verified before stage completion</li>
                                </ul>
                            </li>
                            <li><strong>Schema Evolution:</strong> How the structure changes during execution
                                <ul className="list-disc pl-6 mt-2">
                                    <li>New assets are created as tools process data</li>
                                    <li>Step structure emerges based on execution needs</li>
                                    <li>Tool assignments happen dynamically</li>
                                    <li>Success criteria verification drives progression</li>
                                </ul>
                                <p className="text-gray-700 dark:text-gray-300 mt-2 pl-6">
                                    As the workflow progresses, the schema evolves to reflect the current state of the mission. Each stage's completion is verified against its success criteria, ensuring that the outputs meet the required standards before proceeding. The final stage's completion involves:
                                </p>
                                <ul className="list-disc pl-6 mt-2 text-gray-700 dark:text-gray-300">
                                    <li>Verification that all success criteria are met</li>
                                    <li>Delivery of final outputs that achieve the mission goal</li>
                                    <li>Archiving of completed assets for future reference</li>
                                    <li>Summary of mission results and outcomes</li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                )
            }
        ]
    },
    {
        id: 'interface',
        title: 'Interface Guide',
        content: (
            <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Chat Interface</h4>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                        Your main interaction point with FractalBot:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                        <li>Describe tasks in natural language</li>
                        <li>Review mission proposals</li>
                        <li>Monitor progress updates</li>
                        <li>Provide feedback and guidance</li>
                    </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Workspace</h4>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                        The central area for mission management:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                        <li>View current mission details</li>
                        <li>Track workflow progress</li>
                        <li>Monitor asset status</li>
                        <li>Access tool interfaces</li>
                    </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Tools & Assets Panel</h4>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                        Manage your mission resources:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                        <li>Access available tools</li>
                        <li>View and manage assets</li>
                        <li>Configure tool settings</li>
                        <li>Monitor resource usage</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: 'best-practices',
        title: 'Best Practices',
        content: (
            <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                    TBD
                </div>
            </div>
        )
    }
];

export const HelpGuide: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string>('overview');
    const [activeSubsection, setActiveSubsection] = useState<string | null>(null);

    const renderNavigation = () => {
        return (
            <nav className="p-4 space-y-1">
                {sections.map(section => (
                    <div key={section.id}>
                        <button
                            onClick={() => {
                                setActiveSection(section.id);
                                setActiveSubsection(null);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors
                                      ${activeSection === section.id && !activeSubsection
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            {section.title}
                        </button>
                        {section.id === 'core-concepts' && section.subsections && (
                            <div className="pl-4 mt-1 space-y-1">
                                {section.subsections.map(subsection => (
                                    <button
                                        key={subsection.id}
                                        onClick={() => {
                                            setActiveSection(section.id);
                                            setActiveSubsection(subsection.id);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors
                                                  ${activeSubsection === subsection.id
                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700/50'
                                            }`}
                                    >
                                        {subsection.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>
        );
    };

    const renderContent = () => {
        const section = sections.find(s => s.id === activeSection);
        if (!section) return null;

        if (section.id === 'core-concepts' && activeSubsection) {
            const subsection = section.subsections?.find(s => s.id === activeSubsection);
            return subsection?.content;
        }

        return section.content;
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="inline-flex items-center justify-center rounded-md w-8 h-8
                             text-gray-400 hover:text-gray-500 hover:bg-gray-100
                             dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                             transition-colors"
                    aria-label="Help"
                >
                    <HelpCircle className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
                <DialogClose asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-4
                                 inline-flex items-center justify-center rounded-md w-8 h-8
                                 text-gray-400 hover:text-gray-500 hover:bg-gray-100
                                 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                 transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </DialogClose>
                <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">FractalBot Help Guide</DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Navigation */}
                    <div className="w-48 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
                        {renderNavigation()}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
                        <div className="max-w-4xl mx-auto p-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                {activeSubsection
                                    ? sections.find(s => s.id === activeSection)?.subsections?.find(s => s.id === activeSubsection)?.title
                                    : sections.find(s => s.id === activeSection)?.title}
                            </h2>
                            <div className="prose dark:prose-invert max-w-none">
                                {renderContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}; 