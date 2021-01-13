# Setting up your workspace

## Modules mode
A module is defined by a tree of Go source files with a `go.mod` file in the tree's root directory. Your VS Code project workspace may contain Go source files from one or more modules. `gopls` needs a defined scope in which language features like references, rename, and implementation should operate, so heuristically determines the scope. The followings are the setup supported by the heuristic.

### One module
If you are working with a single module, open the module root (the directory containing the `go.mod` file), a subdirectory within the module, or a parent directory containing the module but being part of another module.

⚠️ NOTE: if you open a parent directory containing a module, it must **only** contain that single module. When multiple modules are found and `gopls` isn't unable to process them, a warning notification will show up in the bottom of the window. <!-- TODO: screenshot? -->

Consider the following folder layout that contains two modules (`moduleA` and `moduleB`).
  ```
  moduleA
  └──go.mod
  ...
  └──moduleB
    └──go.mod
    └──main.go
    └──lib/
        └── lib.go
  ```
If you open the folder `moduleB` or any of the files under it, `gopls` will operate in the scope that contains only `moduleB`.
  
If you open the folder `moduleA` or any of the files under it but outside `moduleB`, `gopls` will operate in the scope that contains only `moduleA`.

### Multiple modules
If you are working with multiple modules, please set up a [multi-root workspace](https://code.visualstudio.com/docs/editor/multi-root-workspaces) and add individual module roots as the workspace folders.

⚠️ NOTE: With this set up, each module has its own scope, and language features will not work across modules unless the their relationship is explicitely stated in the main module's `go.mod` file using the [`replace` redirective](https://github.com/golang/go/wiki/Modules#when-should-i-use-the-replace-directive). This is tedious and error-prone. The `gopls` team is currently working on addressing the limitation around handling a workspace with multiple modules -- see details about [experimental workspace module mode](https://github.com/golang/tools/blob/master/gopls/doc/workspace.md#workspace-module-experimental). If you want to try out the experimental feature, enable it by setting `gopls`'s [`build.experimentalWorkspaceModule`](settings.md#buildexpandworkspacetomodule).

<!-- TODO: Vendor mode -->

## GOPATH mode
From go1.16, you will need to explicitly set the `GO111MODULE` environment variable to `off` to use the `GOPATH` mode.
  ```
  "go.toolsEnvVars": { "GO111MODULE": "off" }
  ```
  In this mode, the scope `gopls` operates in is the folder. If you open the entire `$GOPATH`
or `$GOPATH/src` directory, the scope will include all the packages under `$GOPATH/src`
and `gopls` will try to load all of the files it has found in the scope. To avoid slowdown
and high resource usage, utilize the [per-project `GOPATH`](gopath.md#different-gopaths-for-different-projects) that contains only the packages
you want to work on. The [`GOPATH` page](gopath.md)
discusses a few tips useful when you work in the `GOPATH` mode.
