Option Explicit
Dim soundFile, oPlayer
If WScript.Arguments.Count < 1 Then WScript.Quit

soundFile = WScript.Arguments(0)

On Error Resume Next
Set oPlayer = CreateObject("WMPlayer.OCX.7")
If Err.Number <> 0 Then
    ' 失敗した場合のフォールバック（古い環境など）
    Err.Clear
    Set oPlayer = CreateObject("WMPlayer.OCX")
End If
On Error Goto 0

If IsObject(oPlayer) Then
    oPlayer.settings.volume = 100
    oPlayer.URL = soundFile
    oPlayer.controls.play
    
    ' 再生状態になるまで待機
    Do While oPlayer.playState = 9 ' Transitioning
        WScript.Sleep 10
    Loop

    ' 再生完了まで待機 (1=Stopped, 8=MediaEnded)
    Do Until oPlayer.playState = 1 Or oPlayer.playState = 8
        WScript.Sleep 50
    Loop
End If