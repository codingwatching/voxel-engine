using OpenTK.Graphics.OpenGL;

namespace Project;

public class Framebuffer
{
    public int handle;
    public int texture;

    public Framebuffer()
    {
        CreateFramebuffer();
    }

    public void Clear()
    {
        GL.BindFramebuffer(FramebufferTarget.Framebuffer, handle);
        GL.Clear(ClearBufferMask.ColorBufferBit);
        GL.BindFramebuffer(FramebufferTarget.Framebuffer, handle);
    }

    public void CreateFramebuffer()
    {
        // create framebuffer
        handle = GL.GenFramebuffer();

        // create framebuffer texture
        texture = GL.GenTexture();
        GL.BindTexture(TextureTarget.Texture2D, texture);
        GL.TexImage2D(TextureTarget.Texture2D, 0, PixelInternalFormat.Rgb, 1280, 720, 0, PixelFormat.Rgb, PixelType.Float, 0);
        GL.TexParameter(TextureTarget.Texture2D, TextureParameterName.TextureMagFilter, (int)TextureMinFilter.Nearest);
        GL.TexParameter(TextureTarget.Texture2D, TextureParameterName.TextureMinFilter, (int)TextureMinFilter.Nearest);
        GL.BindTexture(TextureTarget.Texture2D, 0);
        GL.BindFramebuffer(FramebufferTarget.Framebuffer, handle);
        GL.FramebufferTexture2D(FramebufferTarget.Framebuffer, FramebufferAttachment.ColorAttachment0, TextureTarget.Texture2D, texture, 0);
        GL.BindFramebuffer(FramebufferTarget.Framebuffer, 0);
    }
}