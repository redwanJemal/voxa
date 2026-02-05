"""S3/MinIO storage service for file uploads."""

import asyncio
from functools import partial

import boto3
import structlog
from botocore.config import Config as BotoConfig

from app.core.config import settings

logger = structlog.get_logger("storage_service")

_s3_client = None


def _get_client():
    """Get or create a boto3 S3 client."""
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=BotoConfig(signature_version="s3v4"),
        )
    return _s3_client


async def upload_file(content: bytes, key: str, content_type: str) -> str:
    """Upload file bytes to S3/MinIO. Returns the storage key."""
    loop = asyncio.get_event_loop()
    client = _get_client()
    await loop.run_in_executor(
        None,
        partial(
            client.put_object,
            Bucket=settings.S3_BUCKET,
            Key=key,
            Body=content,
            ContentType=content_type,
        ),
    )
    logger.info("file_uploaded", key=key, size=len(content))
    return key


async def delete_file(key: str) -> None:
    """Delete a file from S3/MinIO."""
    loop = asyncio.get_event_loop()
    client = _get_client()
    try:
        await loop.run_in_executor(
            None,
            partial(
                client.delete_object,
                Bucket=settings.S3_BUCKET,
                Key=key,
            ),
        )
        logger.info("file_deleted", key=key)
    except Exception:
        logger.warning("file_delete_failed", key=key, exc_info=True)


async def get_file(key: str) -> bytes:
    """Download file bytes from S3/MinIO."""
    loop = asyncio.get_event_loop()
    client = _get_client()
    response = await loop.run_in_executor(
        None,
        partial(
            client.get_object,
            Bucket=settings.S3_BUCKET,
            Key=key,
        ),
    )
    return response["Body"].read()
