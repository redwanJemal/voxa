"""add provider_keys table and agent llm_provider column

Revision ID: a2f1b3c4d5e6
Revises: e86c306206fc
Create Date: 2026-02-08 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a2f1b3c4d5e6"
down_revision: Union[str, None] = "e86c306206fc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create provider_keys table
    op.create_table(
        "provider_keys",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("encrypted_key", sa.Text(), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "provider", name="uq_org_provider"),
    )
    op.create_index(
        op.f("ix_provider_keys_organization_id"),
        "provider_keys",
        ["organization_id"],
        unique=False,
    )

    # Add llm_provider column to agents
    op.add_column(
        "agents",
        sa.Column(
            "llm_provider",
            sa.String(length=50),
            nullable=False,
            server_default="openai",
        ),
    )


def downgrade() -> None:
    op.drop_column("agents", "llm_provider")
    op.drop_index(
        op.f("ix_provider_keys_organization_id"), table_name="provider_keys"
    )
    op.drop_table("provider_keys")
