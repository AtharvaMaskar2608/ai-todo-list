import importlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine

# Router modules that create_app() includes if present. Each is created by a
# separate parallel change; a missing module is skipped so this factory boots
# standalone and router changes never need to edit this file.
_OPTIONAL_ROUTERS = ("app.routers.todos", "app.routers.agent")


def _include_optional_routers(app: FastAPI) -> None:
    for module_path in _OPTIONAL_ROUTERS:
        try:
            module = importlib.import_module(module_path)
        except ModuleNotFoundError as exc:
            # Only skip when the router module itself is absent; let a genuine
            # missing-dependency error inside an existing router propagate.
            if exc.name == module_path or module_path.startswith(f"{exc.name}."):
                continue
            raise
        app.include_router(module.router)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="AI Todo List")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def _bootstrap_tables() -> None:
        # Import models so their tables are registered on Base before create_all.
        import app.models  # noqa: F401

        Base.metadata.create_all(engine)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    _include_optional_routers(app)
    return app


app = create_app()
