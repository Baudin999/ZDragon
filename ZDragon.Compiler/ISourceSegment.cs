namespace ZDragon.Compiler;

public interface ISourceSegment
{
    int LineStart {get;}
    int LineEnd {get;}
    int WordStart {get;}
    int WordEnd {get;}
}