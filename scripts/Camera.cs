using OpenTK.Mathematics;

namespace Project;

public class Camera
{
    public Vector3 position;
    float pitch;
    float yaw;

    Vector3 front;
    Vector3 up;
    Vector3 right;

    float near = 0.0001f;
    float far = 5000f;

    public Matrix4 viewMatrix;
    public Matrix4 projectionMatrix;

    public void RotateAround(Vector3 target, Vector2 rotation, float offset, float aspect)
    {
        pitch = rotation.Y;
        yaw = rotation.X + MathHelper.DegreesToRadians(90);
        front = new Vector3(MathF.Cos(pitch) * MathF.Cos(yaw), MathF.Sin(pitch), MathF.Cos(pitch) * MathF.Sin(yaw)).Normalized();
        right = Vector3.Normalize(Vector3.Cross(front, Vector3.UnitY));
        up = Vector3.Normalize(Vector3.Cross(right, front));
        position = target + front * offset;
        viewMatrix = Matrix4.LookAt(position, position + front, up);
        projectionMatrix = Matrix4.CreatePerspectiveFieldOfView(1, aspect, near, far);
    }
}