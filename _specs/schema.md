FractalBot Schema


Children help parents as follows:
- parent inputs and outputs are mapped to child state
- child state mirrors parent input and output vars in its own state
    this allows for a single collection of state vars to work with
- child stores output values from its tools and substeps in its state
    how does value then get propagated to parent?


Mission
- represents the goals, inputs and outputs, but none of the inside stuff

Workflow
- a collection of stages used to generate mission outputs from mission inputs
- properties:
    wf state: includes workflow inputs, workflow outputs, and workflow wips
    stages: takes inputs from wf state and provides outputs to wf state
- mission inputs and outputs

Stage
- a collection of steps that operate on workflow state to generate wips and final outputs
- properties:
    sg state:
        any wf state that serves as stage inputs or receives stage outputs
        any wips produced by children of the stage
    steps: takes inputs from sg state and provides outputs to sg state or wf state

