#!/bin/bash
echo "=== Checking AWS Identity ==="
aws sts get-caller-identity

echo -e "\n=== Testing CloudFormation Access ==="
aws cloudformation list-stacks --max-items 1 --region us-east-1 2>&1 | head -3

echo -e "\n=== Testing Lambda Access ==="
aws lambda list-functions --max-items 1 --region us-east-1 2>&1 | head -3

echo -e "\n=== Testing IAM Access ==="
aws iam list-attached-user-policies --user-name bhavinondhiya 2>&1 | head -5
