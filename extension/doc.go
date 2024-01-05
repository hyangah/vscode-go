// Copyright 2024 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// go:build tool

// Package extension is a dummy package to configure
// dependency on github.com/golang/vscode-go/vscgo.
package extension

import (
	_ "github.com/golang/vscode-go" // Tests depend on vscgo.
)
