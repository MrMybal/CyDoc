---
id: blueprints
title: Graphes et Blueprints
description: Un module de graphe à nœuds autonome, lié à vos pages de documentation.
section: Exemples
order: 17
---
Un lecteur de graphes à nœuds avec ports typés, courbes, zones de commentaire, sélection, déplacement, zoom et agrandissement dans la fenêtre. Sélectionnez **Make Help Link** pour ouvrir sa page d’API.

## Graphe interactif {#graph}

```graph
{
  "title": "Aide contextuelle · du clic à la documentation",
  "groups": [
    {
      "title": "Application hôte",
      "x": -25,
      "y": -55,
      "width": 565,
      "height": 250
    }
  ],
  "nodes": [
    {
      "id": "help",
      "title": "Événement · F1",
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
      "description": "Le contexte courant fournit un identifiant de page stable."
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
      "description": "Construit une URL locale encodée.",
      "link": "doc:api-cpp#signature"
    },
    {
      "id": "open",
      "title": "Ouvrir la documentation",
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
      "description": "L’application choisit le navigateur ou la WebView.",
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

## Texte Blueprint Unreal {#unreal}

Le bloc `blueprint` accepte aussi la structure courante du presse-papiers Unreal : objets, positions, pins et connexions. Voici un exemple réellement converti pendant la génération.

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

Le lecteur visualise le graphe ; il ne l’exécute pas. Le parseur couvre les blocs courants `Begin Object` et `CustomProperties Pin`, pas les fichiers binaires `.uasset` ni tous les nœuds et métadonnées possibles d’Unreal. Aucun service BlueprintUE n’est contacté.

## Configuration JSON {#configuration}

```json
{
  "title": "Aide contextuelle · du clic à la documentation",
  "groups": [
    {
      "title": "Application hôte",
      "x": -25,
      "y": -55,
      "width": 565,
      "height": 250
    }
  ],
  "nodes": [
    {
      "id": "help",
      "title": "Événement · F1",
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
      "description": "Le contexte courant fournit un identifiant de page stable."
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
      "description": "Construit une URL locale encodée.",
      "link": "doc:api-cpp#signature"
    },
    {
      "id": "open",
      "title": "Ouvrir la documentation",
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
      "description": "L’application choisit le navigateur ou la WebView.",
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
