# Generated by Django 1.9.13 on 2019-12-03 18:03

from django.db import migrations
import django.db.models.deletion
import sentry.db.models.fields.onetoone


class Migration(migrations.Migration):
    # This flag is used to mark that a migration shouldn't be automatically run in
    # production. We set this to True for operations that we think are risky and want
    # someone from ops to run manually and monitor.
    # General advice is that if in doubt, mark your migration as `is_dangerous`.
    # Some things you should always mark as dangerous:
    # - Adding indexes to large tables. These indexes should be created concurrently,
    #   unfortunately we can't run migrations outside of a transaction until Django
    #   1.10. So until then these should be run manually.
    # - Large data migrations. Typically we want these to be run manually by ops so that
    #   they can be monitored. Since data migrations will now hold a transaction open
    #   this is even more important.
    # - Adding columns to highly active tables, even ones that are NULL.
    is_dangerous = False

    dependencies = [
        ("sentry", "0020_auto_20191125_1420"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterField(
                    model_name="incidentsnapshot",
                    name="incident",
                    field=sentry.db.models.fields.onetoone.OneToOneCascadeDeletes(
                        on_delete=django.db.models.deletion.CASCADE, to="sentry.Incident"
                    ),
                ),
            ],
        )
    ]
