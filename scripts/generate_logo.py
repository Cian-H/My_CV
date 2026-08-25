from logging import Logger
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import typer

app = typer.Typer()

logger = Logger("logo")
main_circle_radius = 5.0
purple_rgb = (0.29, 0.19, 0.45)
orange_rgb = (0.85, 0.53, 0.10)
bg_color = (0.05, 0.05, 0.05)


@app.command()
def generate_logo(
    filename: str = typer.Option(
        "logo.png", "--filename", "-f", help="Output filepath"
    ),
    seed: int = typer.Option(137, "--seed", "-s", help="Random seed"),
    num_nodes: int = typer.Option(12, "--num-nodes", "-n", help="Number of hexagons"),
):
    fig, ax = plt.subplots(figsize=(10, 10))
    ax.set_aspect("equal")
    fig.patch.set_facecolor(bg_color)
    ax.set_facecolor(bg_color)
    ax.set_axis_off()

    main_circle_outline = patches.Circle(
        (0, 0), main_circle_radius, fill=False, color=purple_rgb, linewidth=6, zorder=1
    )
    ax.add_patch(main_circle_outline)

    node_data = []
    np.random.seed(seed)

    max_attempts = 1000
    attempts = 0

    while len(node_data) < num_nodes and attempts < max_attempts:
        attempts += 1
        angle = np.random.uniform(0, 2 * np.pi)
        node_radius = np.random.uniform(0.4, 0.9)

        collision = False
        for existing_node in node_data:
            existing_angle = existing_node["angle"]
            assert not isinstance(existing_angle, tuple)

            existing_radius = existing_node["radius"]
            assert not isinstance(existing_radius, tuple)

            angle_diff = abs(angle - existing_angle)
            angle_diff = min(angle_diff, 2 * np.pi - angle_diff)
            arc_dist = main_circle_radius * angle_diff
            min_dist = node_radius + existing_radius + 0.15

            if arc_dist < min_dist:
                collision = True
                break

        if not collision:
            node_data.append(
                {
                    "angle": angle,
                    "pos": (
                        main_circle_radius * np.cos(angle),
                        main_circle_radius * np.sin(angle),
                    ),
                    "radius": node_radius,
                }
            )

    if len(node_data) < num_nodes:
        logger.warning(
            f"Warning: Only fit {len(node_data)} nodes due to spacing constraints."
        )

    def get_gradient_path(start, end):
        path_data = []
        segments = 60

        mid_x = (start[0] + end[0]) / 2.0
        mid_y = (start[1] + end[1]) / 2.0

        curve_factor = 0.35
        control_point = (mid_x * curve_factor, mid_y * curve_factor)

        for t in np.linspace(0, 1, segments + 1):
            inv_t = 1 - t
            x = (
                (inv_t**2 * start[0])
                + (2 * inv_t * t * control_point[0])
                + (t**2 * end[0])
            )
            y = (
                (inv_t**2 * start[1])
                + (2 * inv_t * t * control_point[1])
                + (t**2 * end[1])
            )
            path_data.append((x, y))

        return path_data

    dense_connections = []
    num_actual_nodes = len(node_data)

    for i in range(num_actual_nodes):
        start_node = node_data[i]
        potential_connections = list(range(num_actual_nodes))
        potential_connections.remove(i)

        targets = np.random.choice(
            potential_connections, size=num_actual_nodes // 2, replace=False
        )

        for target_index in targets:
            connection_pair = tuple(sorted((i, target_index)))
            if connection_pair not in dense_connections:
                end_node = node_data[target_index]
                dense_connections.append(connection_pair)

                path = get_gradient_path(start_node["pos"], end_node["pos"])

                num_segments = len(path) - 1
                for s in range(num_segments):
                    t_segment_start = s / num_segments

                    if t_segment_start <= 0.5:
                        ratio = t_segment_start / 0.5
                        r = purple_rgb[0] * (1 - ratio) + orange_rgb[0] * ratio
                        g = purple_rgb[1] * (1 - ratio) + orange_rgb[1] * ratio
                        b = purple_rgb[2] * (1 - ratio) + orange_rgb[2] * ratio
                    else:
                        ratio = (t_segment_start - 0.5) / 0.5
                        r = orange_rgb[0] * (1 - ratio) + purple_rgb[0] * ratio
                        g = orange_rgb[1] * (1 - ratio) + purple_rgb[1] * ratio
                        b = orange_rgb[2] * (1 - ratio) + purple_rgb[2] * ratio

                    seg_color = (r, g, b, 0.9)

                    ax.plot(
                        [path[s][0], path[s + 1][0]],
                        [path[s][1], path[s + 1][1]],
                        color=seg_color,
                        linewidth=3.5,
                        solid_capstyle="round",
                        zorder=0,
                    )

    for node in node_data:
        node_angle = node["angle"]
        assert not isinstance(node_angle, tuple)
        node_pos = node["pos"]
        assert isinstance(node_pos, tuple)
        node_radius = node["radius"]
        assert not isinstance(node_radius, tuple)

        hex_rotation = node_angle + (np.pi / 2)
        mask_hex = patches.RegularPolygon(
            node_pos,
            numVertices=6,
            radius=node_radius,
            orientation=hex_rotation,
            fill=True,
            color=bg_color,
            zorder=2,
        )
        ax.add_patch(mask_hex)
        node_hex = patches.RegularPolygon(
            node_pos,
            numVertices=6,
            radius=node_radius,
            orientation=hex_rotation,
            fill=False,
            color=purple_rgb,
            linewidth=4.5,
            zorder=3,
        )
        ax.add_patch(node_hex)

    plt.savefig(
        filename,
        facecolor=fig.get_facecolor(),
        bbox_inches="tight",
        pad_inches=0.05,
        dpi=300,
    )
    print(f"Visualization generated successfully as {filename}")
    plt.close()


if __name__ == "__main__":
    app()
