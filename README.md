# datadolphin

Open source csv/xlsx importer

## Deployment

1. Copy .env.template to .env and update values
2. Access the minio console (localhost:9001) and add a new access key with the following policy

```
{
 "Version": "2012-10-17",
 "Statement": [
  {
   "Effect": "Allow",
   "Action": [
    "s3:*"
   ],
   "Resource": [
    "arn:aws:s3:::*"
   ]
  }
 ]
}
```
