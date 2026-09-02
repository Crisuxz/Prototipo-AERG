import logging
import sys


def configure_logging(env: str) -> None:
    level = logging.DEBUG if env == "dev" else logging.INFO
    logging.basicConfig(
        level=level,
        stream=sys.stdout,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
