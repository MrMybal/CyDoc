---
id: code-languages
title: Code & languages
description: C++, Python, HLSL, GLSL, C#, C, JavaScript, Java, and TypeScript.
section: Integration
order: 22
---
All nine languages below have a real source example, build-time highlighting, and an API page extracted from annotations. Click the source path in an API page to see dependencies and code.

## C++ {#cpp}

```cpp
#include "cydoc/help.hpp"
const auto help = cydoc::make_help_link("file:///D:/Documentation/Documentation.html", "fr", "quickstart", "installation");
```

[Open extracted C++ API](doc:api-cpp#signature).

## Python {#python}

```python
from help_link import help_link
url = help_link("file:///home/user/Documentation/Documentation.html", "fr", "quickstart")
```

[Open extracted Python API](doc:api-python#signature).

## C {#c}

```c
#include "help.h"
char route[256];
cydoc_help_link(route, sizeof route, "fr", "quickstart");
```

[Open extracted C API](doc:api-c#signature).

## C# {#csharp}

```csharp
using CyDoc.Examples;
string url = HelpLink.Create("file:///D:/Documentation/Documentation.html", "fr", "quickstart");
```

[Open extracted C# API](doc:api-csharp#signature).

## JavaScript {#javascript}

```javascript
import { helpLink } from "./help.js";
const url = helpLink("./Documentation/Documentation.html", "fr", "quickstart");
```

[Open extracted JavaScript API](doc:api-javascript#signature).

## TypeScript {#typescript}

```typescript
import { helpLink } from "./help.js";
const url: string = helpLink("./Documentation/Documentation.html", "fr", "quickstart");
```

[Open extracted TypeScript API](doc:api-typescript#signature).

## Java {#java}

```java
import cydoc.examples.HelpLink;
String url = HelpLink.create("file:///home/user/Documentation/Documentation.html", "fr", "quickstart");
```

[Open extracted Java API](doc:api-java#signature).

## HLSL {#hlsl}

```hlsl
#include "common.hlsli"
float4 MainPS(float4 position : SV_Position) : SV_Target {
    return float4(ApplyExposure(float3(0.1, 0.5, 0.3), 0.5), 1.0);
}
```

[Open extracted HLSL API](doc:api-hlsl#signature).

## GLSL {#glsl}

```glsl
#version 450
#extension GL_GOOGLE_include_directive : require
#include "common.glsl"
layout(location = 0) out vec4 fragColor;
void main() { fragColor = vec4(applyExposure(vec3(0.1, 0.5, 0.3), 0.5), 1.0); }
```

[Open extracted GLSL API](doc:api-glsl#signature).

HLSL and GLSL document shaders here; they do not launch the viewer. The example GLSL include requires a preprocessor supporting the declared extension. The host application receives the local documentation path.
