using OpenTK.Graphics.OpenGL;
using OpenTK.Mathematics;

namespace Project;

public enum VertexData
{
    fullscreenquad,
    lines
}

public class Shader
{
    public int mainProgramHandle;
    public int postProgramHandle;

    public int fbo;
    public int fbtex;

    public int fsvao;
    public int lsvao;

    private VertexData vertexDataType;

    public Shader(string vertMain, string fragMain, string vertPost, string fragPost, VertexData type)
    {
        // create shaderprogram
        CreateShaderProgram(vertMain, fragMain, vertPost, fragPost);

        // create framebuffer
        CreateFramebuffer();

        // setup vertex data
        CreateVertexDataTypes();
        vertexDataType = type;
    }

    public void RenderToFramebuffer(int width, int height)
    {
        GL.Enable(EnableCap.DepthTest);

        // resize framebuffer texture
        GL.BindTexture(TextureTarget.Texture2D, fbtex);
        GL.TexImage2D(TextureTarget.Texture2D, 0, PixelInternalFormat.Rgb, width, height, 0, PixelFormat.Rgb, PixelType.Float, 0);
        GL.BindTexture(TextureTarget.Texture2D, 0);

        // render main shader program
        GL.Viewport(0, 0, width, height);
        GL.UseProgram(mainProgramHandle);
        GL.BindFramebuffer(FramebufferTarget.Framebuffer, fbo);
        if (vertexDataType == VertexData.fullscreenquad)
        {
            GL.BindVertexArray(fsvao);
            GL.DrawArrays(PrimitiveType.Triangles, 0, 6);
        }
        if (vertexDataType == VertexData.lines)
        {
            GL.BindVertexArray(lsvao);
            GL.DrawArrays(PrimitiveType.Lines, 0, 2);
        }
        GL.BindFramebuffer(FramebufferTarget.Framebuffer, 0);

        GL.Disable(EnableCap.DepthTest);
    }

    public void DisplayFramebuffer(int width, int height)
    {
        GL.Viewport(0, 0, width, height);
        GL.UseProgram(postProgramHandle);
        GL.Uniform1(GL.GetUniformLocation(postProgramHandle, "fbtex"), 0);
        GL.ActiveTexture(TextureUnit.Texture0);
        GL.BindTexture(TextureTarget.Texture2D, fbtex);
        GL.BindVertexArray(fsvao);
        GL.DrawArrays(PrimitiveType.Triangles, 0, 6);
    }

    public void UseMainProgram()
    {
        GL.UseProgram(mainProgramHandle);
    }

    public void SetVoxelData(Voxels data, string name)
    {
        GL.Uniform1(GL.GetUniformLocation(mainProgramHandle, name), 0);
        GL.ActiveTexture(TextureUnit.Texture0);
        GL.BindTexture(TextureTarget.Texture3D, data.texture);
    }

    public void SetAmbientOcclusion(int tex, string name)
    {
        GL.Uniform1(GL.GetUniformLocation(mainProgramHandle, name), 1);
        GL.ActiveTexture(TextureUnit.Texture1);
        GL.BindTexture(TextureTarget.Texture3D, tex);
    }

    public void SetCamera(Camera camera, string viewMatrixName, string cameraPositionName)
    {
        GL.UniformMatrix4(GL.GetUniformLocation(mainProgramHandle, viewMatrixName), true, ref camera.viewMatrix);
        GL.Uniform3(GL.GetUniformLocation(mainProgramHandle, cameraPositionName), camera.position.X, camera.position.Y, camera.position.Z);
    }

    public void SetMatrix4(string name, Matrix4 matrix)
    {
        GL.UniformMatrix4(GL.GetUniformLocation(mainProgramHandle, name), false, ref matrix);
    }
    
    public void SetFloat(string name, float value)
    {
        GL.Uniform1(GL.GetUniformLocation(mainProgramHandle, name), value);
    }

    public void SetInt(string name, int value)
    {
        GL.Uniform1(GL.GetUniformLocation(mainProgramHandle, name), value);
    }

    public void SetBool(string name, bool value)
    {
        GL.Uniform1(GL.GetUniformLocation(mainProgramHandle, name), value ? 1 : 0);
    }

    public void SetVector2(string name, Vector2 value)
    {
        GL.Uniform2(GL.GetUniformLocation(mainProgramHandle, name), value.X, value.Y);
    }

    public void SetVector3(string name, Vector3 value)
    {
        GL.Uniform3(GL.GetUniformLocation(mainProgramHandle, name), value.X, value.Y, value.Z);
    }

    public void CreateShaderProgram(string vertMain, string fragMain, string vertPost, string fragPost)
    {
        // read shaders
        string vertMainCode = File.ReadAllText(vertMain);
        string fragMainCode = File.ReadAllText(fragMain);
        string vertPostCode = File.ReadAllText(vertPost);
        string fragPostCode = File.ReadAllText(fragPost);

        // compile vert main
        int vm = GL.CreateShader(ShaderType.VertexShader);
        GL.ShaderSource(vm, vertMainCode);
        GL.CompileShader(vm);
        GL.GetShader(vm, ShaderParameter.CompileStatus, out int vmStatus);
        if (vmStatus != 1) throw new Exception("vert main failed to compile: " + GL.GetShaderInfoLog(vm));

        // compile frag main
        int fm = GL.CreateShader(ShaderType.FragmentShader);
        GL.ShaderSource(fm, fragMainCode);
        GL.CompileShader(fm);
        GL.GetShader(fm, ShaderParameter.CompileStatus, out int fmStatus);
        if (fmStatus != 1) throw new Exception("frag main failed to compile: " + GL.GetShaderInfoLog(fm));

        // compile vert post
        int vp = GL.CreateShader(ShaderType.VertexShader);
        GL.ShaderSource(vp, vertPostCode);
        GL.CompileShader(vp);
        GL.GetShader(vp, ShaderParameter.CompileStatus, out int vpStatus);
        if (vpStatus != 1) throw new Exception("vert post failed to compile: " + GL.GetShaderInfoLog(vp));

        // compile frag post
        int fp = GL.CreateShader(ShaderType.FragmentShader);
        GL.ShaderSource(fp, fragPostCode);
        GL.CompileShader(fp);
        GL.GetShader(fp, ShaderParameter.CompileStatus, out int fpStatus);
        if (fpStatus != 1) throw new Exception("frag post failed to compile: " + GL.GetShaderInfoLog(fp));

        // create main shader program
        mainProgramHandle = GL.CreateProgram();
        GL.AttachShader(mainProgramHandle, vm);
        GL.AttachShader(mainProgramHandle, fm);
        GL.LinkProgram(mainProgramHandle);
        GL.DetachShader(mainProgramHandle, vm);
        GL.DetachShader(mainProgramHandle, fm);

        // create post shader program
        postProgramHandle = GL.CreateProgram();
        GL.AttachShader(postProgramHandle, vp);
        GL.AttachShader(postProgramHandle, fp);
        GL.LinkProgram(postProgramHandle);
        GL.DetachShader(postProgramHandle, vp);
        GL.DetachShader(postProgramHandle, fp);

        // delete shaders
        GL.DeleteShader(vm);
        GL.DeleteShader(fm);
        GL.DeleteShader(vp);
        GL.DeleteShader(fp);
    }

    public void CreateFramebuffer()
    {
        // create framebuffer
        fbo = GL.GenFramebuffer();

        // create framebuffer texture
        fbtex = GL.GenTexture();
        GL.BindTexture(TextureTarget.Texture2D, fbtex);
        GL.TexImage2D(TextureTarget.Texture2D, 0, PixelInternalFormat.Rgb, 1280, 720, 0, PixelFormat.Rgb, PixelType.Float, 0);
        GL.TexParameter(TextureTarget.Texture2D, TextureParameterName.TextureMagFilter, (int)TextureMinFilter.Nearest);
        GL.TexParameter(TextureTarget.Texture2D, TextureParameterName.TextureMinFilter, (int)TextureMinFilter.Nearest);
        GL.BindTexture(TextureTarget.Texture2D, 0);
        GL.BindFramebuffer(FramebufferTarget.Framebuffer, fbo);
        GL.FramebufferTexture2D(FramebufferTarget.Framebuffer, FramebufferAttachment.ColorAttachment0, TextureTarget.Texture2D, fbtex, 0);
        GL.BindFramebuffer(FramebufferTarget.Framebuffer, 0);
    }

    public void CreateVertexDataTypes()
    {
        float[] fullscreen =
        [
            -1f, 1f, 0f,
            1f, 1f, 0f,
            -1f, -1f, 0f,
            1f, 1f, 0f,
            1f, -1f, 0f,
            -1f, -1f, 0f,
        ];

        float[] lines =
        [
            -100f, 0f, 0f,
            100f, 0f, 0f
        ];

        fsvao = CreateVAO(fullscreen);
        lsvao = CreateVAO(lines);
    }

    public int CreateVAO(float[] vertices)
    {
        // create vbo
        int vbo = GL.GenBuffer();
        GL.BindBuffer(BufferTarget.ArrayBuffer, vbo);
        GL.BufferData(BufferTarget.ArrayBuffer, vertices.Length * sizeof(float), vertices, BufferUsageHint.StaticDraw);
        GL.BindBuffer(BufferTarget.ArrayBuffer, 0);

        // create vao
        int vao = GL.GenVertexArray();
        GL.BindVertexArray(vao);
        GL.BindBuffer(BufferTarget.ArrayBuffer, vbo);
        GL.VertexAttribPointer(0, 3, VertexAttribPointerType.Float, false, 3 * sizeof(float), 0);
        GL.EnableVertexAttribArray(0);
        GL.BindVertexArray(0);

        // return vao
        return vao;
    }
}