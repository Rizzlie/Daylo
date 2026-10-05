import nx from "@nx/eslint-plugin";

export default [
    ...nx.configs["flat/base"],
    ...nx.configs["flat/typescript"],
    ...nx.configs["flat/javascript"],
    {
      "ignores": [
        "**/dist",
        "**/out-tsc",
        "**/vitest.config.*.timestamp*"
      ]
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.cts",
            "**/*.mts",
            "**/*.js",
            "**/*.jsx",
            "**/*.cjs",
            "**/*.mjs"
        ],
        // Tooling configs share the root ESLint config; runtime import rules do not apply.
        ignores: ["**/eslint.config.*"],
        rules: {
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    enforceBuildableLibDependency: true,
                    allow: [],
                    ignoredCircularDependencies: [],
                    allowCircularSelfDependency: false,
                    depConstraints: [
                        {
                            sourceTag: "platform:web",
                            onlyDependOnLibsWithTags: ["platform:web", "platform:shared"],
                            bannedExternalImports: ["@prisma/client", "@prisma/*", "@nestjs/*"]
                        },
                        {
                            sourceTag: "platform:api",
                            onlyDependOnLibsWithTags: ["platform:api", "platform:shared"]
                        },
                        {
                            sourceTag: "platform:shared",
                            onlyDependOnLibsWithTags: ["platform:shared"],
                            bannedExternalImports: ["@angular/*", "@nestjs/*", "@prisma/client", "@prisma/*"]
                        },
                        // Platform-qualified types keep frontend and backend rules separate.
                        {
                            allSourceTags: ["platform:web", "type:app"],
                            onlyDependOnLibsWithTags: ["type:feature", "type:ui", "type:util"]
                        },
                        {
                            allSourceTags: ["platform:web", "type:feature"],
                            onlyDependOnLibsWithTags: ["type:data-access", "type:ui", "type:domain", "type:util"]
                        },
                        {
                            allSourceTags: ["platform:web", "type:data-access"],
                            onlyDependOnLibsWithTags: ["type:api-client", "type:domain", "type:util"]
                        },
                        {
                            allSourceTags: ["platform:web", "type:ui"],
                            onlyDependOnLibsWithTags: ["type:ui", "type:domain", "type:util"]
                        },
                        {
                            sourceTag: "type:domain",
                            onlyDependOnLibsWithTags: ["type:domain", "type:util"],
                            bannedExternalImports: ["@angular/*", "@nestjs/*", "@prisma/client", "@prisma/*"]
                        },
                        {
                            sourceTag: "type:util",
                            onlyDependOnLibsWithTags: ["type:util"]
                        },
                        {
                            sourceTag: "type:api-client",
                            onlyDependOnLibsWithTags: []
                        },
                        {
                            allSourceTags: ["platform:api", "type:app"],
                            onlyDependOnLibsWithTags: ["type:api-feature", "type:api-infrastructure", "type:api-contract", "type:contract", "type:util"]
                        },
                        {
                            sourceTag: "type:api-feature",
                            onlyDependOnLibsWithTags: ["type:api-data-access", "type:api-domain", "type:api-contract", "type:api-infrastructure", "type:contract", "type:util"]
                        },
                        {
                            sourceTag: "type:api-data-access",
                            onlyDependOnLibsWithTags: ["type:api-domain", "type:api-contract", "type:api-infrastructure", "type:util"]
                        },
                        {
                            sourceTag: "type:api-domain",
                            onlyDependOnLibsWithTags: ["type:api-domain", "type:util"],
                            bannedExternalImports: ["@angular/*", "@nestjs/*", "@prisma/client", "@prisma/*"]
                        },
                        {
                            sourceTag: "type:api-contract",
                            onlyDependOnLibsWithTags: ["type:api-contract", "type:util"],
                            bannedExternalImports: ["@angular/*", "@nestjs/*", "@prisma/client", "@prisma/*"]
                        },
                        {
                            sourceTag: "type:api-infrastructure",
                            onlyDependOnLibsWithTags: ["type:api-infrastructure", "type:api-contract", "type:util"]
                        },
                        {
                            sourceTag: "type:contract",
                            onlyDependOnLibsWithTags: ["type:util"],
                            bannedExternalImports: ["@angular/*", "@nestjs/*", "@prisma/client", "@prisma/*"]
                        },
                        // E2E exercises the running application rather than importing features.
                        {
                            allSourceTags: ["platform:web", "type:e2e"],
                            onlyDependOnLibsWithTags: ["type:util"]
                        },
                        {
                            allSourceTags: ["platform:web", "scope:tasks"],
                            onlyDependOnLibsWithTags: ["scope:tasks", "scope:core", "scope:shared"]
                        },
                        {
                            allSourceTags: ["platform:web", "scope:groups"],
                            onlyDependOnLibsWithTags: ["scope:groups", "scope:core", "scope:shared"]
                        },
                        {
                            allSourceTags: ["platform:web", "scope:settings"],
                            onlyDependOnLibsWithTags: ["scope:settings", "scope:core", "scope:shared"]
                        },
                        {
                            sourceTag: "scope:core",
                            onlyDependOnLibsWithTags: ["scope:core", "scope:shared"]
                        },
                        {
                            sourceTag: "scope:shared",
                            onlyDependOnLibsWithTags: ["scope:shared"]
                        },
                        {
                            allSourceTags: ["platform:web", "scope:app"],
                            onlyDependOnLibsWithTags: ["scope:core", "scope:tasks", "scope:groups", "scope:settings", "scope:shared"]
                        },
                        {
                            allSourceTags: ["platform:api", "scope:app"],
                            onlyDependOnLibsWithTags: ["scope:core", "scope:auth", "scope:users", "scope:groups", "scope:tasks", "scope:shared"]
                        },
                        // Capability tags allow only the documented cross-area contracts.
                        // Type constraints still require api-contract targets for these exceptions.
                        {
                            allSourceTags: ["platform:api", "scope:tasks"],
                            onlyDependOnLibsWithTags: ["scope:tasks", "scope:core", "scope:shared", "contract:group-access"]
                        },
                        {
                            allSourceTags: ["platform:api", "scope:auth"],
                            onlyDependOnLibsWithTags: ["scope:auth", "scope:core", "scope:shared", "contract:user-identity", "contract:invitation-admission"]
                        },
                        {
                            allSourceTags: ["platform:api", "scope:users"],
                            onlyDependOnLibsWithTags: ["scope:users", "scope:core", "scope:shared"]
                        },
                        {
                            allSourceTags: ["platform:api", "scope:groups"],
                            onlyDependOnLibsWithTags: ["scope:groups", "scope:core", "scope:shared", "contract:user-activation"]
                        }
                    ]
                }
            ]
        }
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.cts",
            "**/*.mts",
            "**/*.js",
            "**/*.jsx",
            "**/*.cjs",
            "**/*.mjs"
        ],
        // Override or add rules here
        rules: {}
    }
];
