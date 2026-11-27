---
id: blueprints
title: Graphs & Blueprints
description: An independent node graph module linked to your documentation pages.
section: Examples
order: 17
previous: diagrams
next: integration
revision: 1
---
A node graph viewer with typed ports, curves, comment groups and in-window enlargement. Scrolling over the graph normally scrolls the manual. Select a node to read its role and follow its documentation link.

Choose **Explore graph** to drag the canvas and zoom with the wheel or the +/− buttons. The arrow keys move the canvas; +/− zoom, Home fits the graph and Escape leaves exploration. Browser zoom shortcuts remain available. On touch screens, leave exploration to resume vertical page scrolling. When enlarged, Escape first leaves exploration; another Escape reduces the viewer.

Open **Text view: nodes and connections** to read node descriptions, ports and outgoing connections without manipulating the canvas. Search by a node's name or description. **Show** centers and selects that node in the graph; its documentation link is also available in the text view. Try **Make Help Link** to reach its API page.

## Interactive graph {#graph}

```graph
{
  "title": "Contextual help · from click to documentation",
  "groups": [
    {
      "title": "Host application",
      "x": -25,
      "y": -55,
      "width": 565,
      "height": 250
    }
  ],
  "nodes": [
    {
      "id": "help",
      "title": "Event · F1",
      "type": "event",
      "x": 0,
      "y": 0,
      "outputs": [
        {
          "id": "exec",
          "label": "",
          "type": "exec"
        },
        {
          "id": "page",
          "label": "Page ID",
          "type": "string"
        }
      ],
      "description": "The current context provides a stable page ID."
    },
    {
      "id": "link",
      "title": "Make Help Link",
      "x": 310,
      "y": 0,
      "inputs": [
        {
          "id": "exec",
          "label": "",
          "type": "exec"
        },
        {
          "id": "page",
          "label": "Page ID",
          "type": "string"
        }
      ],
      "outputs": [
        {
          "id": "exec",
          "label": "",
          "type": "exec"
        },
        {
          "id": "url",
          "label": "Local URL",
          "type": "string"
        }
      ],
      "description": "Build an encoded local URL.",
      "link": "doc:api-cpp#signature"
    },
    {
      "id": "open",
      "title": "Open documentation",
      "type": "function",
      "x": 650,
      "y": 0,
      "inputs": [
        {
          "id": "exec",
          "label": "",
          "type": "exec"
        },
        {
          "id": "url",
          "label": "Local URL",
          "type": "string"
        }
      ],
      "outputs": [],
      "description": "The application chooses its browser or WebView.",
      "link": "doc:integration"
    }
  ],
  "links": [
    {
      "from": [
        "help",
        "exec"
      ],
      "to": [
        "link",
        "exec"
      ]
    },
    {
      "from": [
        "help",
        "page"
      ],
      "to": [
        "link",
        "page"
      ]
    },
    {
      "from": [
        "link",
        "exec"
      ],
      "to": [
        "open",
        "exec"
      ]
    },
    {
      "from": [
        "link",
        "url"
      ],
      "to": [
        "open",
        "url"
      ]
    }
  ]
}
```

## Unreal Blueprint text {#unreal}

A blueprint block also accepts the common Unreal clipboard structure: objects, positions, pins, and connections. This example is actually converted during generation.

```blueprint
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberName="ReceiveBeginPlay")
   NodePosX=0
   NodePosY=0
   CustomProperties Pin (PinId=AAA1,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_0 BBB1,))
End Object
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberName="PrintString")
   NodePosX=350
   NodePosY=0
   CustomProperties Pin (PinId=BBB1,PinName="execute",PinType.PinCategory="exec",LinkedTo=(K2Node_Event_0 AAA1,))
   CustomProperties Pin (PinId=BBB2,PinName="InString",PinType.PinCategory="string",DefaultValue="Hello CyDoc")
End Object
```

The viewer visualizes the graph; it does not execute it. The parser covers common Begin Object and CustomProperties Pin blocks, not binary .uasset files or every possible Unreal node and metadata field. No BlueprintUE service is contacted.

## Configuration JSON {#configuration}

```json
{
  "title": "Contextual help · from click to documentation",
  "groups": [
    {
      "title": "Host application",
      "x": -25,
      "y": -55,
      "width": 565,
      "height": 250
    }
  ],
  "nodes": [
    {
      "id": "help",
      "title": "Event · F1",
      "type": "event",
      "x": 0,
      "y": 0,
      "outputs": [
        {
          "id": "exec",
          "label": "",
          "type": "exec"
        },
        {
          "id": "page",
          "label": "Page ID",
          "type": "string"
        }
      ],
      "description": "The current context provides a stable page ID."
    },
    {
      "id": "link",
      "title": "Make Help Link",
      "x": 310,
      "y": 0,
      "inputs": [
        {
          "id": "exec",
          "label": "",
          "type": "exec"
        },
        {
          "id": "page",
          "label": "Page ID",
          "type": "string"
        }
      ],
      "outputs": [
        {
          "id": "exec",
          "label": "",
          "type": "exec"
        },
        {
          "id": "url",
          "label": "Local URL",
          "type": "string"
        }
      ],
      "description": "Build an encoded local URL.",
      "link": "doc:api-cpp#signature"
    },
    {
      "id": "open",
      "title": "Open documentation",
      "type": "function",
      "x": 650,
      "y": 0,
      "inputs": [
        {
          "id": "exec",
          "label": "",
          "type": "exec"
        },
        {
          "id": "url",
          "label": "Local URL",
          "type": "string"
        }
      ],
      "outputs": [],
      "description": "The application chooses its browser or WebView.",
      "link": "doc:integration"
    }
  ],
  "links": [
    {
      "from": [
        "help",
        "exec"
      ],
      "to": [
        "link",
        "exec"
      ]
    },
    {
      "from": [
        "help",
        "page"
      ],
      "to": [
        "link",
        "page"
      ]
    },
    {
      "from": [
        "link",
        "exec"
      ],
      "to": [
        "open",
        "exec"
      ]
    },
    {
      "from": [
        "link",
        "url"
      ],
      "to": [
        "open",
        "url"
      ]
    }
  ]
}
```
