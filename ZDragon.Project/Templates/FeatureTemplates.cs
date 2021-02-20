using System;

namespace ZDragon.Project.Templates {
    public static class FeatureTemplates {


        public static Func<string, string> Default = (name) => {
            return $@"
# Audit trails

## Authors

| Name  |  Description  |
| :------------ | :------------ |
| Authors  | your name   |
| Status | draft |

## Revisions
| Date | Name  | Description |
| :--- | :---- | :---------- |
| 02/19/2021  | Peter Pan   | Initial draft |
|   |    |  |

## Reviews
| Date | Name  | Description |
| :--- | :---- | :---------- |
|  - | -   | - |


# Feature {name}

This is the feature description which we need to actually understand what the feature is all about.

# Definition of Done (DoD)


Give a description of when the feature is done:

 - [x] Set up design document
 - [x] Use bullet-points
 - [x] To show when something is done
 - [ ] Create nice feature description
 - [ ] Take a break and drink coffee

# Architecture

Please give a description of the intended architecture. You can open other files to use blocks defined in those files. Please read the documentation on how to create an architecture diagram.

You might even want to add some code to your documentation:

```js
function logger(n) {{
    console.log(n);
    return n;
}}
```

person User =
    Interactions:
        - GetDataEndpoint

endpoint GetDataEndpoint :: PersonId -> Person =
    Name: Get Data
    Interactions: 
        - FeatureComponent001

component FeatureComponent001 =
    Name: Feature Component 001
    Description: A general feature component
    Interactions: 
        - FeatureDatabase

component FeatureDatabase =
    Name: Feature Database
    Type: Database

system CloudSystem =
    Name: Cloud System
    Contains:
        - GetDataEndpoint
        - FeatureComponent001
        - FeatureDatabase
    
type PersonId = Guid;

record Person =
    Id: PersonId;
    FirstName: String;

";
        };
    }
}
