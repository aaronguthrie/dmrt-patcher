#!/bin/bash
# Script to list all API endpoints in a Next.js App Router project

echo "🔍 Finding all API endpoints..."
echo ""

BASE_DIR="app/api"

# Find all route.ts files
find "$BASE_DIR" -name "route.ts" -type f | sort | while read -r file; do
    # Extract the endpoint path
    endpoint=$(echo "$file" | sed "s|$BASE_DIR/||" | sed "s|/route\.ts$||")
    
    # Get HTTP methods exported
    methods=$(grep -E "^export (async )?function (GET|POST|PATCH|PUT|DELETE|OPTIONS)" "$file" 2>/dev/null | \
              sed 's/.*function //' | \
              sed 's/(.*//' | \
              tr '\n' ',' | \
              sed 's/,$//')
    
    if [ -z "$methods" ]; then
        methods="(none found)"
    fi
    
    # Format endpoint
    if [ "$endpoint" = "route.ts" ]; then
        endpoint="/"
    else
        endpoint="/api/$endpoint"
    fi
    
    echo "📍 $endpoint"
    echo "   Methods: $methods"
    echo "   File: $file"
    echo ""
done

echo "✅ Done!"


