// Copyright 2023 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"
)

func main() {

	checkWD()
	version, isRC := releaseVersion()

	fmt.Println(version)
	fmt.Println(isRC)

	packageFile := buildPackage(version)

	fmt.Println(packageFile)
}

func checkWD() {
	wd, err := os.Getwd()
	if err != nil {
		fatalf("failed to get working directory")
	}
	// check if package.json is in the working directory
	if _, err := os.Stat("package.json"); os.IsNotExist(err) {
		fatalf("package.json not found in working directory %q", wd)
	}
}

func releaseVersion() (version string, isPrerelease bool) {
	TAG_NAME, ok := os.LookupEnv("TAG_NAME")
	if !ok {
		fatalf("TAG_NAME environment variable is not set")
	}

	versionTagRE := regexp.MustCompile(`^v(?P<MajorMinorPatch>\d+\.\d+\.\d+)(?P<Label>\S*)$`)
	m := versionTagRE.FindStringSubmatch(TAG_NAME)
	if m == nil {
		fatalf("TAG_NAME environment variable %q is not a valid version", TAG_NAME)
	}
	mmp := m[versionTagRE.SubexpIndex("MajorMinorPatch")]
	label := m[versionTagRE.SubexpIndex("Label")]
	if label != "" {
		// TODO:
		if !strings.HasPrefix(label, "-rc.") {
			fatalf("TAG_NAME environment variable %q is not a valid release candidate version", TAG_NAME)
		}
		isPrerelease = true
	}

	cmd := exec.Command("jq", "-r", ".version", "package.json")
	cmd.Stderr = os.Stderr
	writtenVersion, err := cmd.Output()
	if err != nil {
		fatalf("failed to read package.json version")
	}
	if string(bytes.TrimSpace(writtenVersion)) != mmp {
		fatalf("package.json version %q does not match TAG_NAME %q", writtenVersion, version)
	}

	return mmp + label, isPrerelease
}

func buildPackage(version string) string {

	output := fmt.Sprintf("go-%s.vsix", version)
	cmd := exec.Command("npx", "vsce", "package", "-o", output, "--no-update-package-json", "--no-git-tag-version", version)
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fatalf("failed to build package")
	}

	cmd = exec.Command("git", "add", output)
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fatalf("failed to build package")
	}
	return output
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format, args...)
	os.Exit(2)
}
