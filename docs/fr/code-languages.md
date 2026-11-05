---
id: code-languages
title: Code et langages
description: C++, Python, HLSL, GLSL, C#, C, JavaScript, Java et TypeScript.
section: Intégration
order: 22
---
Les neuf langages ci-dessous ont un exemple source réel, une coloration au build et une page d’API extraite de leurs annotations. Cliquez sur le chemin source dans une page d’API pour consulter ses dépendances et son code.

## C++ {#cpp}

```cpp
#include "cydoc/help.hpp"
const auto help = cydoc::make_help_link("file:///D:/Help/index.html", "fr", "quickstart", "installation");
```

[Ouvrir l’API extraite C++](doc:api-cpp#signature).

## Python {#python}

```python
from help_link import help_link
url = help_link("file:///home/user/help/index.html", "fr", "quickstart")
```

[Ouvrir l’API extraite Python](doc:api-python#signature).

## C {#c}

```c
#include "help.h"
char route[256];
cydoc_help_link(route, sizeof route, "fr", "quickstart");
```

[Ouvrir l’API extraite C](doc:api-c#signature).

## C# {#csharp}

```csharp
using CyDoc.Examples;
string url = HelpLink.Create("file:///D:/Help/index.html", "fr", "quickstart");
```

[Ouvrir l’API extraite C#](doc:api-csharp#signature).

## JavaScript {#javascript}

```javascript
import { helpLink } from "./help.js";
const url = helpLink("./help/index.html", "fr", "quickstart");
```

[Ouvrir l’API extraite JavaScript](doc:api-javascript#signature).

## TypeScript {#typescript}

```typescript
import { helpLink } from "./help.js";
const url: string = helpLink("./help/index.html", "fr", "quickstart");
```

[Ouvrir l’API extraite TypeScript](doc:api-typescript#signature).

## Java {#java}

```java
import cydoc.examples.HelpLink;
String url = HelpLink.create("file:///home/user/help/index.html", "fr", "quickstart");
```

[Ouvrir l’API extraite Java](doc:api-java#signature).

## HLSL {#hlsl}

```hlsl
#include "common.hlsli"
float4 MainPS(float4 position : SV_Position) : SV_Target {
    return float4(ApplyExposure(float3(0.1, 0.5, 0.3), 0.5), 1.0);
}
```

[Ouvrir l’API extraite HLSL](doc:api-hlsl#signature).

## GLSL {#glsl}

```glsl
#version 450
#extension GL_GOOGLE_include_directive : require
#include "common.glsl"
layout(location = 0) out vec4 fragColor;
void main() { fragColor = vec4(applyExposure(vec3(0.1, 0.5, 0.3), 0.5), 1.0); }
```

[Ouvrir l’API extraite GLSL](doc:api-glsl#signature).

HLSL et GLSL servent ici à documenter les shaders ; ils n’ouvrent pas eux-mêmes le lecteur. L’include GLSL de l’exemple demande un préprocesseur compatible avec l’extension indiquée. L’application hôte reçoit le chemin local de la documentation.
