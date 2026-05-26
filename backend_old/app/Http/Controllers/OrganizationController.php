<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Organization;

class OrganizationController extends Controller
{
    public function createOrg(Request $request){
        $data = $request->validate([
            'name' => 'required|string|unique:organizations,name',
        ]);

        $org = Organization::create(['name' => $data['name']]);
        if(!empty($org)){
            return response()->json([
                'message' => 'Организация успешно создана'
            ]);
        }
    }

    public function getOrganizationInfo($id){
        $organizations = Organization::with(['groups','groups.students'])->findOrFail($id);
        return response()->json([
            'data' => $organizations,
        ],200,[], JSON_UNESCAPED_UNICODE);
    }

    public function deleteOrganizations($id){
        $organizations = Organization::findOrFail($id)->delete();
        return response()->json([
            'message' => '',
        ]);
    }

    public function allOrganizations(){
        $organizations = Organization::all();

        return response()->json([
            'data' => $organizations,
        ]);
    } 
}
