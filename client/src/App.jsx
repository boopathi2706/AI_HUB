import React from 'react'
import {BrowserRouter ,Routes, Route } from 'react-router-dom'
import "./App.css"

import AI_Text_Summarizer from './Components/AI_Text_Summarizer'
import AI_Grammar_Checker from './Components/AI_Grammar_Checker'
import AI_Email_Writer from './Components/AI_Email_Writer'
import AI_Blog_Title_Generator from './Components/AI_Blog_Title_Generator'
import AI_Hashtag_Generator from './Components/AI_Hashtag_Generator'
import AI_Interview_Question_Generator from './Components/AI_Interview_Question_Generator'
import AI_Cover_Letter_Generator from './Components/AI_Cover_Letter_Generator'
import AI_Code_Explainer from './Components/AI_Code_Explainer'
import AI_SQL_Query_Generator from './Components/AI_SQL_Query_Generator'
import AI_JWT_Token_Generator from './Components/AI_JWT_Token_Generator'
import AI_Name_Generator from './Components/AI_Name_Generator'
import AI_Quiz_Generator from './Components/AI_Quiz_Generator'
import AI_Joke_Generator from './Components/AI_Joke_Generator'
import AI_Recipe_Generator from './Components/AI_Recipe_Generator'
import AI_Story_Generator from './Components/AI_Story_Generator'
import Home from './Pages/Home'

// import Splash_Screen from './Pages/Splash_Screen'

const App = () => {
  return (
    <BrowserRouter>
    <Routes>
       <Route path="/" element={<Home/>}/>


      <Route path="/text-summarizer" element={<AI_Text_Summarizer />} />
      <Route path="/grammar-checker" element={<AI_Grammar_Checker />} />
      <Route path="/email-writer" element={<AI_Email_Writer />} />
      <Route path="/blog-title-generator" element={<AI_Blog_Title_Generator />} />
      <Route path="/hashtag-generator" element={<AI_Hashtag_Generator />} />

      <Route path="/interview-question-generator" element={<AI_Interview_Question_Generator />}/>
      <Route path="/cover-letter-generator" element={<AI_Cover_Letter_Generator />}/>
      <Route path="/code-explainer" element={<AI_Code_Explainer />} />
      <Route path="/sql-query-generator" element={<AI_SQL_Query_Generator />} />
      <Route path="/jwt-token-generator" element={<AI_JWT_Token_Generator />} />


      <Route path="/name-generator" element={<AI_Name_Generator />} />
      <Route path="/quiz-generator" element={<AI_Quiz_Generator />} />
      <Route path="/joke-generator" element={<AI_Joke_Generator />} />
      <Route path="/recipe-generator" element={<AI_Recipe_Generator />} />
      <Route path='/story-generator' element={<AI_Story_Generator/>}/>


    </Routes>
    </BrowserRouter>
  )
}

export default App